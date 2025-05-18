import { isPlatformBrowser } from '@angular/common';
import { Component, Inject, PLATFORM_ID } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import ePub from 'epubjs';
import { MatSidenavModule } from '@angular/material/sidenav';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet,
    MatSidenavModule
  ],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
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

        this.book = ePub('/assets/2011.epub');
        // this.book = ePub('/assets/moby-dick/OPS/package.opf');
        // this.book = Epub('/assets/26/extracted_content/OEBPS/content.opf');
        // this.book = Epub('/assets/43/OEBPS/content.opf');


        // Use proper error handling and options for Safari compatibility
        // this.book = ePub('/assets/46/extracted_content/OEBPS/content.opf', {
        //   encoding: 'binary',
        //   openAs: 'epub'
        // });

        this.rendition = this.book.renderTo('viewer', {
          // flow: 'paginated', // Changed from scrolled-doc for better Safari support
          flow: 'scrolled-doc',
          width: '100%',
          height: '100%',
          allowScriptedContent: true,
          manager: 'default'
        });

        this.rendition.display().catch((error: Error) => {
          console.error('Error displaying book:', error);
        });

        // Add error handling for book loading
        this.book.ready.catch((error: Error) => {
          console.error('Error loading book:', error);
        });
      } catch (error: unknown) {
        console.error('Error initializing book:', error);
      }
    }
  }

  nextPage() {
    if (this.rendition) {
      this.rendition.next();
    }
  }

  prevPage() {
    if (this.rendition) {
      this.rendition.prev();
    }
  }
}
function Epub(arg0: string): any {
  throw new Error('Function not implemented.');
}

