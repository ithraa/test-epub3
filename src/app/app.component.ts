import { isPlatformBrowser } from '@angular/common';
import { Component, Inject, PLATFORM_ID } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import ePub from 'epubjs';
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
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

    this.book = ePub('/assets/26/EPUB/package.opf');
    // this.book = ePub('/assets/accessible_epub_3/EPUB/package.opf');
    // this.book = ePub('/assets/262/extracted_content/OEBPS/content.opf');

    this.rendition = this.book.renderTo('viewer', {
      flow: 'scrolled-doc',
      width: '100%',
      height: '100%',
      allowScriptedContent: true
    });
// test
    this.rendition.display();
  }
}

  nextPage(){
    this.rendition.next()
  }
  prevPage(){
    this.rendition.prev();
  }
}
