import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

interface Cliente {
  id?: number;
  dniOrRuc: string;
  razonSocialONombre: string;
  direccion: string;
  telefono: string;
}

@Component({
  selector: 'app-cliente',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './cliente.component.html',
  styleUrl: './cliente.component.css',
})
export class ClienteComponent {
  clientes: Cliente[] = [];
  mostrarFormulario = false;
  editCliente: Cliente | null = null;
  formCliente: Cliente = { dniOrRuc: '', razonSocialONombre: '', direccion: '', telefono: '' };
  busqueda: string = ''; // NUEVO
  private apiUrl = 'http://localhost:8080/api/clientes';

  constructor(private http: HttpClient) {
    this.cargarClientes();
  }

  cargarClientes() {
    this.http.get<Cliente[]>(this.apiUrl).subscribe(data => this.clientes = data);
  }

  // NUEVO: filtro para la tabla
  get clientesFiltrados(): Cliente[] {
    const texto = this.busqueda.trim().toLowerCase();
    if (!texto) return this.clientes;
    return this.clientes.filter(c =>
      c.dniOrRuc.toLowerCase().includes(texto) ||
      c.razonSocialONombre.toLowerCase().includes(texto)
    );
  }

  guardar() {
    if (this.editCliente && this.editCliente.id) {
      // Editar
      this.http.put<Cliente>(`${this.apiUrl}/${this.editCliente.id}`, this.formCliente).subscribe(() => {
        this.cargarClientes();
        this.mostrarFormulario = false;
        this.editCliente = null;
        this.formCliente = { dniOrRuc: '', razonSocialONombre: '', direccion: '', telefono: '' };
      });
    } else {
      // Nuevo
      this.http.post<Cliente>(this.apiUrl, this.formCliente).subscribe(() => {
        this.cargarClientes();
        this.mostrarFormulario = false;
        this.formCliente = { dniOrRuc: '', razonSocialONombre: '', direccion: '', telefono: '' };
      });
    }
  }

  eliminarCliente(id: number | undefined) {
    if(!id) return;
    if(confirm('¿Seguro que deseas eliminar este cliente?')) {
      this.http.delete(`${this.apiUrl}/${id}`).subscribe(() => this.cargarClientes());
    }
  }

  editar(cliente: Cliente) {
    this.editCliente = cliente;
    this.formCliente = { ...cliente };
    this.mostrarFormulario = true;
  }

  nuevoCliente() {
    this.editCliente = null;
    this.formCliente = { dniOrRuc: '', razonSocialONombre: '', direccion: '', telefono: '' };
    this.mostrarFormulario = true;
  }

  cancelar() {
    this.mostrarFormulario = false;
    this.editCliente = null;
  }
}
