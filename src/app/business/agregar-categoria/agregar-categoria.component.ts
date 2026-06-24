import { Component } from '@angular/core';
import { CategoriaComponent } from '../categoria/categoria.component';

@Component({
  selector: 'app-agregar-categoria',
  standalone: true,
  imports: [CategoriaComponent],
  template: '<app-categoria></app-categoria>',
})
export class AgregarCategoriaComponent {}
