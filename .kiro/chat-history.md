Tolong bantu saya membuat aplikasi web "Expense & Budget Visualizer" yang mobile-friendly untuk melacak pengeluaran harian pengguna.

Tolong ikuti seluruh spesifikasi dan batasan teknis proyek berikut:

Batasan Teknis (Technical Constraints):
Stack: Gunakan HTML untuk struktur, CSS untuk styling, dan Vanilla JavaScript (tanpa framework seperti React/Vue dan tanpa backend server).
Penyimpanan Data: Gunakan browser Local Storage API (semua data disimpan di sisi klien).
Antarmuka: Bersih, minimalis, sederhana, serta responsif di perangkat mobile.
Fitur Utama (MVP):
Form Input: Memiliki field "Item Name", "Amount", dan "Category" (pilihan: Food, Transport, Fun). Sertakan validasi input agar seluruh field wajib diisi sebelum ditambahkan.
Total Balance: Menampilkan total saldo/pengeluaran di bagian atas yang otomatis diperbarui saat transaksi ditambah atau dihapus.
Transaction List: Tampilan daftar transaksi yang dapat di-scroll, menampilkan nama, jumlah, kategori, serta opsi untuk menghapus transaksi.
Visual Chart: Pie chart yang menampilkan distribusi pengeluaran berdasarkan kategori (menggunakan Chart.js atau pustaka grafik sederhana lainnya) yang otomatis terbarui saat data berubah.
Tolong buatkan struktur file (HTML, CSS, dan JS) dan berikan kodenya secara bertahap beserta penjelasannya.

Brief_SEFC_Expense ….pdf

Tolong bantu saya membuat aplikasi web "Expense & Budget Visualizer" yang mobile-friendly untuk melacak pengeluaran harian pengguna.

Tolong ikuti seluruh spesifikasi dan batasan teknis proyek berikut:

Batasan Teknis (Technical Constraints):
Stack: Gunakan HTML untuk struktur, CSS untuk styling, dan Vanilla JavaScript (tanpa framework seperti React/Vue dan tanpa backend server).
Penyimpanan Data: Gunakan browser Local Storage API (semua data disimpan di sisi klien).
Antarmuka: Bersih, minimalis, sederhana, serta responsif di perangkat mobile.
Fitur Utama (MVP):
Form Input: Memiliki field "Item Name", "Amount", dan "Category" (pilihan: Food, Transport, Fun). Sertakan validasi input agar seluruh field wajib diisi sebelum ditambahkan.
Total Balance: Menampilkan total saldo/pengeluaran di bagian atas yang otomatis diperbarui saat transaksi ditambah atau dihapus.
Transaction List: Tampilan daftar transaksi yang dapat di-scroll, menampilkan nama, jumlah, kategori, serta opsi untuk menghapus transaksi.
Visual Chart: Pie chart yang menampilkan distribusi pengeluaran berdasarkan kategori (menggunakan Chart.js atau pustaka grafik sederhana lainnya) yang otomatis terbarui saat data berubah.
Tolong buatkan struktur file (HTML, CSS, dan JS) dan berikan kodenya secara bertahap beserta penjelasannya.

Brief_SEFC_Expense ….pdf

Baca semua file yang ada dulu sebelum mulai edit:Sudah baca semua file. Sekarang update ketiganya sekaligus:Sekarang update semua 3 file sekaligus:Semua 3 fitur berhasil ditambahkan. Berikut penjelasan implementasinya:

---

**1. Dark / Light Mode Toggle**
- Tombol 🌙/☀️ di pojok kanan atas header
- `data-theme="dark"` ditaruh di `<html>` — CSS meng-override semua variabel warna di blok `[data-theme="dark"]` secara otomatis
- Semua elemen pakai `transition: background-color/color 0.3s ease` untuk efek smooth
- Preferensi disimpan di `localStorage`, juga membaca `prefers-color-scheme` OS jika belum ada preferensi tersimpan

**2. Custom Categories**
- Dropdown sekarang punya opsi sentinel `＋ Add New Category` di bawah
- Saat dipilih, muncul input + tombol "Save" inline di form
- Kategori baru disimpan di localStorage key terpisah (`expense_visualizer_custom_categories`)
- Warna otomatis diambil dari palet 12 warna (`CUSTOM_COLOR_PALETTE`) — konsisten di dropdown, transaction item border, dan pie chart
- Kartu "Custom Categories" muncul di bawah (chips yang bisa dihapus dengan ✕)

**3. Monthly Summary View**
- Kartu biru di atas form berisi `<input type="month">` dan tombol "Show All"
- Saat bulan dipilih: daftar transaksi & pie chart hanya menampilkan data bulan itu, badge muncul di heading list
- Total Balance di atas tetap menampilkan **semua transaksi** (all-time), tapi ringkasan bulan tampil terpisah di kartu summary
- Setiap transaksi baru sekarang menyimpan field `date` (ISO string) agar bisa difilter