import { isPlatformBrowser } from '@angular/common';
import { Component, Inject, PLATFORM_ID } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import ePub from 'epubjs';
import {MatSidenavModule} from '@angular/material/sidenav';
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet,MatSidenavModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'epub3';
  private book: any;
  private rendition: any;
  private isBrowser: boolean;

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  ngAfterViewInit(): void {
    if (this.isBrowser) {
      try {
         this.book = ePub('/assets/accessible_epub_3/EPUB/package.opf');
        // Load book with WebKit-friendly configuration
        // this.book = ePub('/assets/26/OEBPS/content.opf');

        this.rendition = this.book.renderTo('viewer', {
          flow: 'paginated',
          width: '100%',
          height: '100%',
          spread: 'none',
          minSpreadWidth: 901, // Prevents spread view on iPad
          manager: 'continuous' // Better for WebKit browsers
        });

        // Add navigation event handlers
        this.rendition.on('relocated', (location: any) => {
          console.log('Current location:', location);
          // Force layout recalculation for WebKit
          setTimeout(() => {
            window.dispatchEvent(new Event('resize'));
          }, 100);
        });

        // Initialize display with error handling
        this.rendition.display().then(() => {
          console.log('Book displayed successfully');
          return this.book.locations.generate();
        }).catch((error: Error) => {
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
      }
    }
  }

  // Improved navigation methods
  nextPage() {
    if (this.rendition) {
      this.rendition.next().catch((error: Error) => {
        console.error('Error navigating to next page:', error);
      });
    }
  }

  prevPage() {
    if (this.rendition) {
      this.rendition.prev().catch((error: Error) => {
        console.error('Error navigating to previous page:', error);
      });
    }
  }

  // Add method to navigate to a specific chapter
  navigateToChapter(href: string) {
    if (this.rendition) {
      this.rendition.display(href).catch((error: Error) => {
        console.error('Error navigating to chapter:', error);
      });
    }
  }
}
function Epub(arg0: string): any {
  throw new Error('Function not implemented.');
}

