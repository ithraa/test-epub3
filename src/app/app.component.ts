import { isPlatformBrowser } from '@angular/common';
import { Component, Inject, PLATFORM_ID } from '@angular/core';
import ePub from 'epubjs';
import {MatSidenavModule} from '@angular/material/sidenav';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [MatSidenavModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'epub3';
  private book: any;
  private rendition: any;
  private isBrowser: boolean;
  private currentChapter: string = '';
  private isNavigating: boolean = false;

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  ngAfterViewInit(): void {
    if (this.isBrowser) {
      // Add touch event support for Safari/iOS
      if (this.isSafari()) {
        this.setupTouchNavigation();
      }
      try {
        console.log('Initializing book...');
        this.book = ePub('/assets/26/EPUB/package.opf');

        // Add book loading event handlers
        this.book.on('book:ready', () => {
          console.log('Book is ready');
          // Generate locations after book is ready
          this.book.locations.generate().then(() => {
            console.log('Locations generated');
          }).catch((error: any) => {
            console.error('Error generating locations:', error);
          });
        });

        this.book.on('book:error', (error: any) => {
          console.error('Book error:', error);
        });

        // Safari-optimized configuration
        const isSafari = this.isSafari();
        
        // Use specific configurations for Safari to prevent blank pages
        if (isSafari) {
          this.rendition = this.book.renderTo('viewer', {
            flow: 'scrolled-continuous',
            width: '100%',
            height: '100%',
            spread: 'none',
            minSpreadWidth: 901,
            manager: 'continuous',
            allowScriptedContent: false,
            enableWebKit: true,
            snap: false,
            infinite: true,
            overflow: 'visible'
          });
        } else {
          // Standard configuration for other browsers
          this.rendition = this.book.renderTo('viewer', {
            flow: 'paginated',
            width: '100%',
            height: '100%',
            spread: 'none',
            minSpreadWidth: 901,
            manager: 'default',
            allowScriptedContent: false
          });
        }

        // Add rendition event handlers
        this.rendition.on('rendered', (section: any) => {
          console.log('Section rendered:', section.href);
          this.currentChapter = section.href;
          
          // Force layout recalculation in Safari
          if (this.isSafari()) {
            // Trigger multiple reflow events to ensure proper rendering
            window.dispatchEvent(new Event('resize'));
            const viewerElement = document.getElementById('viewer');
            if (viewerElement) {
              viewerElement.style.display = 'none';
              setTimeout(() => {
                viewerElement.style.display = '';
                window.dispatchEvent(new Event('resize'));
              }, 10);
            }
          }
        });

        this.rendition.on('relocated', (location: any) => {
          console.log('Current location:', location);
          
          // Track the current chapter more reliably
          if (location.start) {
            const currentHref = location.start.href;
            if (currentHref) {
              this.currentChapter = currentHref;
            }
          }
          
          // Check if we're at the end of the current section
          if (location.atEnd && !this.isNavigating) {
            this.navigateToNextChapter();
          }
          
          // Add extra handling for Safari
          if (this.isSafari()) {
            // Multiple resize events help ensure proper rendering
            setTimeout(() => { window.dispatchEvent(new Event('resize')); }, 50);
            setTimeout(() => { window.dispatchEvent(new Event('resize')); }, 100);
            setTimeout(() => { window.dispatchEvent(new Event('resize')); }, 300);
            
            // Force a display refresh to prevent blank pages
            const viewer = document.getElementById('viewer');
            if (viewer) {
              // Temporarily toggle visibility to force redraw
              viewer.style.opacity = '0.99';
              setTimeout(() => {
                viewer.style.opacity = '1';
              }, 50);
            }
          }
        });

        // Initialize display with error handling
        console.log('Displaying book...');
        this.rendition.display().then(() => {
          console.log('Book displayed successfully');
        }).catch((error: Error) => {
          console.error('Error displaying book:', error);
        });

        // Ensure navigation works properly
        this.book.ready.then(() => {
          console.log('Book spine:', this.book.spine);
          console.log('Book navigation:', this.book.navigation);
          if (!this.book.pageList) {
            console.log('Initializing page list');
            this.book.pageList = {
              pageFromCfi: () => undefined,
              cfiFromPage: () => undefined,
              pages: [],
              locations: [],
              length: 0
            };
          }
        }).catch((error: Error) => {
          console.error('Error during book initialization:', error);
        });

      } catch (error: unknown) {
        console.error('Error initializing book:', error);
      }
    }
  }

  // Helper method to detect Safari browser
  private isSafari(): boolean {
    if (typeof navigator === 'undefined') return false;
    const ua = navigator.userAgent.toLowerCase();
    return (ua.includes('safari') && !ua.includes('chrome')) || 
           /iP(ad|hone|od)/.test(navigator.userAgent) || 
           (/^((?!chrome|android).)*safari/i.test(navigator.userAgent));
  }

  // Helper method to get next chapter
  private getNextChapterHref(): string | null {
    if (!this.book || !this.book.spine) return null;
    
    if (this.isSafari()) {
      // For Safari, use a more direct approach to spine navigation
      const currentIndex = this.book.spine.spineItems.findIndex((item: any) => 
        item.href === this.currentChapter || this.currentChapter.endsWith(item.href));
      
      if (currentIndex >= 0 && currentIndex < this.book.spine.spineItems.length - 1) {
        return this.book.spine.spineItems[currentIndex + 1].href;
      }
      return null;
    } else {
      // Standard approach for other browsers
      const currentSpineItem = this.book.spine.get(this.currentChapter);
      if (!currentSpineItem) return null;
      
      const nextSpineItem = this.book.spine.next();
      return nextSpineItem ? nextSpineItem.href : null;
    }
  }

  // Helper method to get previous chapter
  private getPrevChapterHref(): string | null {
    if (!this.book || !this.book.spine) return null;
    
    if (this.isSafari()) {
      // For Safari, use a more direct approach to spine navigation
      const currentIndex = this.book.spine.spineItems.findIndex((item: any) => 
        item.href === this.currentChapter || this.currentChapter.endsWith(item.href));
      
      if (currentIndex > 0) {
        return this.book.spine.spineItems[currentIndex - 1].href;
      }
      return null;
    } else {
      // Standard approach for other browsers
      const currentSpineItem = this.book.spine.get(this.currentChapter);
      if (!currentSpineItem) return null;
      
      const prevSpineItem = this.book.spine.prev();
      return prevSpineItem ? prevSpineItem.href : null;
    }
  }

  // Navigation to next chapter
  private navigateToNextChapter() {
    const nextHref = this.getNextChapterHref();
    if (nextHref) {
      this.isNavigating = true;
      this.navigateToChapter(nextHref);
    }
  }
  
  // Setup touch navigation for Safari/iOS
  private setupTouchNavigation() {
    if (!this.isBrowser) return;
    
    const viewer = document.getElementById('viewer');
    if (!viewer) return;
    
    // Track touch start position
    let touchStartX = 0;
    
    viewer.addEventListener('touchstart', (e: TouchEvent) => {
      touchStartX = e.touches[0].clientX;
    }, { passive: true });
    
    viewer.addEventListener('touchend', (e: TouchEvent) => {
      const touchEndX = e.changedTouches[0].clientX;
      const diff = touchEndX - touchStartX;
      
      // If the swipe is significant enough (more than 50px)
      if (Math.abs(diff) > 50) {
        if (diff > 0) {
          // Swipe right - go to previous page
          this.prevPage();
        } else {
          // Swipe left - go to next page
          this.nextPage();
        }
      }
    }, { passive: true });
  }

  // Navigation methods with Safari-specific handling
  nextPage() {
    if (this.rendition) {
      // Store current location before navigation
      let currentHref = '';
      const location = this.rendition.currentLocation();
      if (location && location.start && location.start.href) {
        currentHref = location.start.href;
      }
      
      if (this.isSafari()) {
        // For Safari: Check if we're at the end of the current section first
        if (location && location.atEnd) {
          this.navigateToNextChapter();
          return;
        }
        
        // Force a redraw before navigation in Safari
        const viewer = document.getElementById('viewer');
        if (viewer) {
          // Brief flicker to force redraw
          viewer.style.opacity = '0.99';
          setTimeout(() => {
            viewer.style.opacity = '1';
          }, 10);
        }
      }
      
      this.rendition.next().then(() => {
        // If we're still on the same page after navigation in Safari, try chapter navigation
        if (this.isSafari()) {
          const newLocation = this.rendition.currentLocation();
          if (newLocation && newLocation.start && newLocation.start.href === currentHref) {
            console.log('Page navigation didn\'t change location, trying chapter navigation');
            this.navigateToNextChapter();
            return;
          }
          
          // Multiple resize events for better Safari rendering
          setTimeout(() => { window.dispatchEvent(new Event('resize')); }, 50);
          setTimeout(() => { window.dispatchEvent(new Event('resize')); }, 150);
          setTimeout(() => { window.dispatchEvent(new Event('resize')); }, 300);
        }
      }).catch((error: Error) => {
        console.error('Error navigating to next page:', error);
        // If navigation fails, try moving to next chapter
        this.navigateToNextChapter();
      });
    }
  }

  prevPage() {
    if (this.rendition) {
      // Store current location before navigation
      let currentHref = '';
      const location = this.rendition.currentLocation();
      if (location && location.start && location.start.href) {
        currentHref = location.start.href;
      }
      
      if (this.isSafari()) {
        // For Safari: Check if we're at the start of the current section first
        if (location && location.atStart) {
          const prevHref = this.getPrevChapterHref();
          if (prevHref) {
            this.navigateToChapter(prevHref);
            return;
          }
        }
        
        // Force a redraw before navigation in Safari
        const viewer = document.getElementById('viewer');
        if (viewer) {
          // Brief flicker to force redraw
          viewer.style.opacity = '0.99';
          setTimeout(() => {
            viewer.style.opacity = '1';
          }, 10);
        }
      }
      
      this.rendition.prev().then(() => {
        // If we're still on the same page after navigation in Safari, try chapter navigation
        if (this.isSafari()) {
          const newLocation = this.rendition.currentLocation();
          if (newLocation && newLocation.start && newLocation.start.href === currentHref) {
            console.log('Page navigation didn\'t change location, trying chapter navigation');
            const prevHref = this.getPrevChapterHref();
            if (prevHref) {
              this.navigateToChapter(prevHref);
              return;
            }
          }
          
          // Multiple resize events for better Safari rendering
          setTimeout(() => { window.dispatchEvent(new Event('resize')); }, 50);
          setTimeout(() => { window.dispatchEvent(new Event('resize')); }, 150);
          setTimeout(() => { window.dispatchEvent(new Event('resize')); }, 300);
        }
      }).catch((error: Error) => {
        console.error('Error navigating to previous page:', error);
        // Try moving to previous chapter
        const prevHref = this.getPrevChapterHref();
        if (prevHref) {
          this.navigateToChapter(prevHref);
        }
      });
    }
  }

  // Navigation to specific chapter with Safari optimization
  navigateToChapter(href: string) {
    if (this.rendition) {
      this.isNavigating = true;
      
      // Safari-specific handling before navigation
      if (this.isSafari()) {
        // Pre-navigation preparation for Safari
        const viewer = document.getElementById('viewer');
        if (viewer) {
          // Force a repaint before navigation
          viewer.style.visibility = 'hidden';
          setTimeout(() => {
            viewer.style.visibility = 'visible';
          }, 10);
        }
      }
      
      this.rendition.display(href).then(() => {
        this.currentChapter = href;
        
        if (this.isSafari()) {
          // Multiple resize events help ensure proper rendering in Safari
          const triggerResize = () => window.dispatchEvent(new Event('resize'));
          
          // Staggered resize events
          triggerResize();
          setTimeout(triggerResize, 50);
          setTimeout(triggerResize, 150);
          setTimeout(triggerResize, 300);
          setTimeout(triggerResize, 500);
          
          // Final check to ensure content is visible
          setTimeout(() => {
            const viewer = document.getElementById('viewer');
            if (viewer) {
              viewer.style.opacity = '0.99';
              setTimeout(() => {
                viewer.style.opacity = '1';
                this.isNavigating = false;
              }, 50);
            } else {
              this.isNavigating = false;
            }
          }, 200);
        } else {
          this.isNavigating = false;
        }
      }).catch((error: Error) => {
        console.error('Error navigating to chapter:', error);
        this.isNavigating = false;
      });
    }
  }
}