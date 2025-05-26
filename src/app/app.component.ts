import { isPlatformBrowser, CommonModule } from '@angular/common';
import { Component, Inject, PLATFORM_ID, NgZone, HostListener, ElementRef, ViewChild } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import ePub from 'epubjs';
import { MatSidenavModule } from '@angular/material/sidenav';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, MatSidenavModule, CommonModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  @ViewChild('viewer', { static: false }) viewerElement?: ElementRef;
  
  title = 'epub3';
  private book: any;
  private rendition: any;
  private isBrowser: boolean = false;
  private isSafari: boolean = false;
  private isIOS: boolean = false;
  private currentLocation: any;
  private isNavigating: boolean = false;
  private spineItems: any[] = [];
  private currentSpineIndex: number = 0;
  private touchStartX: number = 0;
  private touchEndX: number = 0;
  
  // Direct iframe fallback for Safari
  useSafariFallback: boolean = false;
  currentChapterUrl: SafeResourceUrl | null = null;
  showIframe: boolean = false;

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private ngZone: NgZone,
    private sanitizer: DomSanitizer
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
    
    if (this.isBrowser) {
      // Detect Safari browser and iOS devices
      const userAgent = navigator.userAgent;
      this.isSafari = /^((?!chrome|android).)*safari/i.test(userAgent);
      this.isIOS = /iPad|iPhone|iPod/.test(userAgent);
      console.log('Browser detection - Safari:', this.isSafari, 'iOS:', this.isIOS);
    }
  }
  
  // Add touch event handlers for Safari on iOS
  @HostListener('touchstart', ['$event'])
  onTouchStart(event: TouchEvent) {
    if (this.isSafari || this.isIOS) {
      this.touchStartX = event.touches[0].clientX;
    }
  }
  
  @HostListener('touchend', ['$event'])
  onTouchEnd(event: TouchEvent) {
    if (this.isSafari || this.isIOS) {
      this.touchEndX = event.changedTouches[0].clientX;
      const diff = this.touchStartX - this.touchEndX;
      
      // Swipe detection
      if (Math.abs(diff) > 50) { // threshold
        if (diff > 0) {
          // Swipe left - next page
          this.nextPage();
        } else {
          // Swipe right - previous page
          this.prevPage();
        }
      }
    }
  }

  ngAfterViewInit(): void {
    if (this.isBrowser) {
      try {
        console.log('Initializing EPUB reader');
        
        // Add error event listener to window for uncaught errors
        window.addEventListener('error', (event) => {
          console.error('Global error caught:', event.error || event.message);
        });
        
        // Add unhandled promise rejection handler
        window.addEventListener('unhandledrejection', (event) => {
          console.error('Unhandled Promise Rejection:', event.reason);
        });
        
        // Use direct iframe fallback for Safari
        if (this.isSafari) {
          console.log('Using Safari-specific iframe fallback');
          this.useSafariFallback = true;
          this.loadSafariEpubFallback();
          return; // Skip standard EPUBjs initialization for Safari
        }
        
        // Standard initialization for non-Safari browsers
        console.log('Loading EPUB book: /assets/26/OEBPS/content.opf');
        this.book = ePub('/assets/26/OEBPS/content.opf');

        console.log('Configuring renderer options');
        
        // Standard configuration for non-Safari browsers
        const renditionOptions: any = {
          width: '100%',
          height: '100%',
          spread: 'none',
          flow: 'paginated',
          manager: 'default',
          minSpreadWidth: 901 // Prevents spread view on iPad
        };
        
        console.log('Using standard browser configuration');
        
        console.log('Creating rendition with options:', JSON.stringify(renditionOptions));
        this.rendition = this.book.renderTo('viewer', renditionOptions);
        console.log('Rendition created successfully');

        // Store spine items for navigation
        this.book.loaded.spine.then((spine: any) => {
          this.spineItems = spine.spineItems;
          console.log('Spine items loaded:', this.spineItems.length);
        });

        // Add navigation event handlers for non-Safari browsers
        this.rendition.on('relocated', (location: any) => {
          console.log('Current location:', location);
          this.currentLocation = location;
          
          // Update current spine index for navigation
          if (location && location.start) {
            const href = location.start.href?.split('#')[0];
            this.currentSpineIndex = this.spineItems.findIndex((item: any) => item.href === href);
            console.log('Current spine index:', this.currentSpineIndex);
          }
          
          // Allow navigation again after content is properly rendered
          setTimeout(() => {
            window.dispatchEvent(new Event('resize'));
            this.isNavigating = false;
          }, 100);
        });

        // Initialize display with basic error handling for non-Safari browsers
        console.log('Attempting to display book');
        this.rendition.display().then(() => {
          console.log('Book displayed successfully');
          return this.book.locations.generate(1024);
        }).then(() => {
          console.log('Locations generated successfully');
        }).catch((error: any) => {
          console.error('Error displaying book:', error);
        });

        // Patch: Ensure navigation works even if pageList is missing
        this.book.ready.then(() => {
          if (!this.book.pageList) {
            console.log('Patching missing pageList');
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
        
        // If we encounter an error, switch to Safari fallback mode
        this.useSafariFallback = true;
        this.loadSafariEpubFallback();
      }
    }
  }
  
  // Safari-specific direct iframe fallback implementation
  private loadSafariEpubFallback() {
    console.log('Loading Safari EPUB fallback');
    // Define the chapters in book 26
    const chapters = [
      { href: '/assets/26/OEBPS/Text/1-1.xhtml', title: 'Chapter 1-1' },
      { href: '/assets/26/OEBPS/Text/1-3.xhtml', title: 'Chapter 1-3' },
      { href: '/assets/26/OEBPS/Text/1-2.xhtml', title: 'Chapter 1-2' },
      { href: '/assets/26/OEBPS/Text/1-4.xhtml', title: 'Chapter 1-4' },
      { href: '/assets/26/OEBPS/Text/1-5.xhtml', title: 'Chapter 1-5' }
    ];
    
    this.spineItems = chapters;
    this.currentSpineIndex = 0;
    
    // Load the first chapter
    this.loadChapterInIframe(this.spineItems[0].href);
  }
  
  // Load a specific chapter in the iframe
  private loadChapterInIframe(href: string) {
    console.log('Loading chapter in iframe:', href);
    this.currentChapterUrl = this.sanitizer.bypassSecurityTrustResourceUrl(href);
    this.showIframe = true;
  }
  // Simplified navigation methods with iframe fallback for Safari
  nextPage() {
    // Safari iframe fallback navigation
    if (this.useSafariFallback) {
      console.log('Safari fallback: next chapter');
      if (this.currentSpineIndex < this.spineItems.length - 1) {
        this.currentSpineIndex++;
        this.loadChapterInIframe(this.spineItems[this.currentSpineIndex].href);
      } else {
        console.log('Already at last chapter');
      }
      return;
    }
    
    // Standard navigation for other browsers
    if (this.rendition && !this.isNavigating) {
      this.isNavigating = true;
      this.rendition.next().catch((error: Error) => {
        console.error('Error navigating to next page:', error);
        this.isNavigating = false;
      });
    }
  }

  prevPage() {
    // Safari iframe fallback navigation
    if (this.useSafariFallback) {
      console.log('Safari fallback: previous chapter');
      if (this.currentSpineIndex > 0) {
        this.currentSpineIndex--;
        this.loadChapterInIframe(this.spineItems[this.currentSpineIndex].href);
      } else {
        console.log('Already at first chapter');
      }
      return;
    }
    
    // Standard navigation for other browsers
    if (this.rendition && !this.isNavigating) {
      this.isNavigating = true;
      this.rendition.prev().catch((error: Error) => {
        console.error('Error navigating to previous page:', error);
        this.isNavigating = false;
      });
    }
  }
  
  // Navigate directly to a specific chapter by index (useful for table of contents)
  navigateToChapterByIndex(index: number) {
    if (index >= 0 && index < this.spineItems.length) {
      // Safari iframe fallback navigation
      if (this.useSafariFallback) {
        this.currentSpineIndex = index;
        this.loadChapterInIframe(this.spineItems[index].href);
        return;
      }
      
      // Standard navigation for other browsers
      if (this.rendition) {
        this.isNavigating = true;
        this.currentSpineIndex = index;
        const item = this.spineItems[index];
        
        console.log(`Navigating to chapter index ${index}:`, item.href);
        
        this.rendition.display(item.href).catch((error: Error) => {
          console.error('Error navigating to chapter by index:', error);
          this.isNavigating = false;
        });
      }
    }
  }

  // Navigate to a specific chapter by href
  navigateToChapter(href: string) {
    // Find the spine index for this href for tracking
    const index = this.spineItems.findIndex((item: any) => item.href === href);
    if (index !== -1) {
      this.currentSpineIndex = index;
      
      // Safari iframe fallback navigation
      if (this.useSafariFallback) {
        this.loadChapterInIframe(href);
        return;
      }
      
      // Standard navigation for other browsers
      if (this.rendition) {
        this.isNavigating = true;
        console.log(`Navigating to chapter with href: ${href}`);
        
        this.rendition.display(href).catch((error: Error) => {
          console.error('Error navigating to chapter:', error);
          this.isNavigating = false;
        });
      }
    }
  }
  
  // Force refresh the current view - useful when rendering gets stuck
  refreshView() {
    if (this.useSafariFallback) {
      // For Safari fallback, reload the current chapter
      if (this.currentSpineIndex >= 0 && this.currentSpineIndex < this.spineItems.length) {
        this.loadChapterInIframe(this.spineItems[this.currentSpineIndex].href);
      }
      return;
    }
    
    // For standard renderer
    if (this.rendition && this.currentLocation) {
      const cfi = this.currentLocation.start.cfi;
      console.log('Forcing refresh at current location:', cfi);
      
      this.rendition.display(cfi).catch((error: Error) => {
        console.error('Error refreshing view:', error);
      });
    }
  }
}
function Epub(arg0: string): any {
  throw new Error('Function not implemented.');
}

