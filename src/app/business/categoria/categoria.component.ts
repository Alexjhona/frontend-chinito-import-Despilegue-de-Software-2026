import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

interface Categoria {
  id?: number;
  nombre: string;
}

@Component({
  selector: 'app-categoria',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './categoria.component.html',
  styleUrl: './categoria.component.css',
})
export class CategoriaComponent {
  categorias: Categoria[] = [];
  mostrarFormulario = false;
  editCategoria: Categoria | null = null;
  formCategoria: Categoria = { nombre: '' };
  busqueda: string = ''; // NUEVO: búsqueda
  private apiUrl = 'http://localhost:8080/api/categorias';

  constructor(private http: HttpClient) {
    this.cargarCategorias();
  }

  cargarCategorias() {
    this.http.get<Categoria[]>(this.apiUrl).subscribe(data => this.categorias = data);
  }

  // NUEVO: filtro para el ngFor
  get categoriasFiltradas(): Categoria[] {
    const texto = this.busqueda.trim().toLowerCase();
    if (!texto) return this.categorias;
    return this.categorias.filter(c =>
      c.nombre.toLowerCase().includes(texto) ||
      (c.id !== undefined && c.id.toString().includes(texto))
    );
  }

  guardar() {
    if (this.editCategoria && this.editCategoria.id) {
      // Editar
      this.http.put<Categoria>(`${this.apiUrl}/${this.editCategoria.id}`, this.formCategoria).subscribe(() => {
        this.cargarCategorias();
        this.mostrarFormulario = false;
        this.editCategoria = null;
        this.formCategoria = { nombre: '' };
      });
    } else {
      // Nuevo
      this.http.post<Categoria>(this.apiUrl, this.formCategoria).subscribe(() => {
        this.cargarCategorias();
        this.mostrarFormulario = false;
        this.formCategoria = { nombre: '' };
      });
    }
  }

  eliminarCategoria(id: number | undefined) {
    if (!id) return;
    if (confirm('¿Seguro que deseas eliminar esta categoría?')) {
      this.http.delete(`${this.apiUrl}/${id}`).subscribe(() => this.cargarCategorias());
    }
  }

  editar(categoria: Categoria) {
    this.editCategoria = categoria;
    this.formCategoria = { ...categoria };
    this.mostrarFormulario = true;
  }

  nuevaCategoria() {
    this.editCategoria = null;
    this.formCategoria = { nombre: '' };
    this.mostrarFormulario = true;
  }

  cancelar() {
    this.mostrarFormulario = false;
    this.editCategoria = null;
  }
}
