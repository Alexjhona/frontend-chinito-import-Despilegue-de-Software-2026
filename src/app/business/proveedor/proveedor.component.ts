import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

interface Proveedor {
  id?: number;
  dniOrRuc: string;
  razonSocialONombre: string;
  direccion: string;
  telefono: string;
}

@Component({
  selector: 'app-proveedor',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './proveedor.component.html',
  styleUrl: './proveedor.component.css',
})
export class ProveedorComponent {
  proveedores: Proveedor[] = [];
  mostrarFormulario = false;
  editProveedor: Proveedor | null = null;
  formProveedor: Proveedor = { dniOrRuc: '', razonSocialONombre: '', direccion: '', telefono: '' };
  busqueda: string = ''; // NUEVO
  private apiUrl = 'http://localhost:8080/api/proveedores';

  constructor(private http: HttpClient) {
    this.cargarProveedores();
  }

  cargarProveedores() {
    this.http.get<Proveedor[]>(this.apiUrl).subscribe(data => this.proveedores = data);
  }

  // NUEVO: filtro para la tabla
  get proveedoresFiltrados(): Proveedor[] {
    const texto = this.busqueda.trim().toLowerCase();
    if (!texto) return this.proveedores;
    return this.proveedores.filter(p =>
      p.dniOrRuc.toLowerCase().includes(texto) ||
      p.razonSocialONombre.toLowerCase().includes(texto)
    );
  }

  guardar() {
    if (this.editProveedor && this.editProveedor.id) {
      // Editar
      this.http.put<Proveedor>(`${this.apiUrl}/${this.editProveedor.id}`, this.formProveedor).subscribe(() => {
        this.cargarProveedores();
        this.mostrarFormulario = false;
        this.editProveedor = null;
        this.formProveedor = { dniOrRuc: '', razonSocialONombre: '', direccion: '', telefono: '' };
      });
    } else {
      // Nuevo
      this.http.post<Proveedor>(this.apiUrl, this.formProveedor).subscribe(() => {
        this.cargarProveedores();
        this.mostrarFormulario = false;
        this.formProveedor = { dniOrRuc: '', razonSocialONombre: '', direccion: '', telefono: '' };
      });
    }
  }

  eliminarProveedor(id: number | undefined) {
    if(!id) return;
    if(confirm('¿Seguro que deseas eliminar este proveedor?')) {
      this.http.delete(`${this.apiUrl}/${id}`).subscribe(() => this.cargarProveedores());
    }
  }

  editar(proveedor: Proveedor) {
    this.editProveedor = proveedor;
    this.formProveedor = { ...proveedor };
    this.mostrarFormulario = true;
  }

  nuevoProveedor() {
    this.editProveedor = null;
    this.formProveedor = { dniOrRuc: '', razonSocialONombre: '', direccion: '', telefono: '' };
    this.mostrarFormulario = true;
  }

  cancelar() {
    this.mostrarFormulario = false;
    this.editProveedor = null;
  }
}
