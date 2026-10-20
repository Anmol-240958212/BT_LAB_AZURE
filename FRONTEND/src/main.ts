import { platformBrowser } from '@angular/platform-browser';
import { registerLocaleData } from '@angular/common';
import hi from '@angular/common/locales/hi';
import { AppModule } from './app/app.module';

registerLocaleData(hi, 'hi-IN');

platformBrowser().bootstrapModule(AppModule, {
  
})
  .catch(err => console.error(err));
