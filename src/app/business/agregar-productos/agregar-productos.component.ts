import { Component } from '@angular/core';
import { ProductoComponent } from '../producto/producto.component';

@Component({
  selector: 'app-agregar-productos',
  standalone: true,
  imports: [ProductoComponent],
  template: '<app-producto></app-producto>',
})
export class AgregarProductosComponent {}
