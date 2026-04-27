# Format Level Bobo Run

Level utama dibaca dari `level-1.json`.

## Konsep

Gunakan format JSON dengan tiga bagian utama:

- `legend`: daftar kode pendek dan arti tiap kode.
- `rows`: susunan map yang mudah diedit.
- `entities`: objek khusus yang butuh pengaturan detail.

Contoh kode:

```json
"legend": {
  "0": { "name": "Tanah", "terrain": "ground" },
  "1": { "name": "Pohon", "terrain": "ground", "decoration": "tree" },
  "2": { "name": "Rintangan", "terrain": "ground", "obstacle": "block" },
  "3": { "name": "Monster", "terrain": "ground", "spawn": "monster" },
  "F": { "name": "Kalong terbang", "terrain": "ground", "spawn": "flying" },
  "K3": { "name": "3 koin di tanah", "terrain": "ground", "coinPattern": "line3-ground" },
  "K4": { "name": "4 koin lompat", "terrain": "ground", "coinPattern": "line4-jump" },
  "K6": { "name": "6 koin di tanah", "terrain": "ground", "coinPattern": "line6-ground" },
  "KA": { "name": "6 koin melengkung", "terrain": "ground", "coinPattern": "arc6-jump" },
  "S": { "name": "Tangga naik 3 susun", "terrain": "ground", "obstacle": "stairs-up", "stairSteps": 3 },
  "T": { "name": "Tangga turun 3 susun", "terrain": "ground", "obstacle": "stairs-down", "stairSteps": 3 },
  "S5": { "name": "Tangga naik 5 susun", "terrain": "ground", "obstacle": "stairs-up", "stairSteps": 5 },
  "T5": { "name": "Tangga turun 5 susun", "terrain": "ground", "obstacle": "stairs-down", "stairSteps": 5 },
  "P5": { "name": "Bukit tangga 5 susun", "terrain": "ground", "obstacle": "stairs-peak", "stairSteps": 5 }
}
```

Contoh map:

```json
"rows": [
  "0 K3 1 0 2 K4 0 3",
  "0 K6 0 S T KA 0 F"
]
```

Untuk runner side-scrolling saat ini, setiap kode dibaca berurutan dari kiri ke kanan. Baris kedua melanjutkan baris pertama.

## Musuh

Kode musuh yang sudah tersedia:

- `3`: monster tanah.
- `F`: kalong terbang. Saat kalong datang dari depan, Bobo otomatis menembak 45 derajat ke atas.

## Pola Koin dan Tangga

Kode koin yang sudah tersedia:

- `K3`: 3 koin rendah di atas tanah, bisa diambil sambil lari.
- `K4`: 4 koin lebih tinggi, harus lompat.
- `K6`: 6 koin rendah memanjang.
- `KA`: 6 koin bentuk arc/melengkung untuk jalur lompatan.

Kode tanah bertangga:

- `S2`: tangga naik 2 susun.
- `T2`: tangga turun 2 susun.
- `S`: tangga naik 3 susun.
- `T`: tangga turun 3 susun.
- `S5`: tangga naik 5 susun.
- `T5`: tangga turun 5 susun.
- `P5`: bukit tangga 5 susun, naik lalu turun dalam satu tile.

Untuk membuat jalur naik-turun yang enak, susun `S T` atau ulangi beberapa kali:

```json
"rows": [
  "0 S2 T2 S T S5 T5 P5 K4 0"
]
```

Engine membatasi `stairSteps` maksimal 5 agar tangga tetap bisa dimainkan dan tidak terlalu curam.

## Saran Pengembangan

Untuk item yang sederhana dan sering dipakai, tambahkan kode baru di `legend`, misalnya:

```json
"H": { "name": "Health", "terrain": "ground", "item": "health" }
```

Untuk objek yang butuh detail, pakai `entities`, misalnya monster khusus:

```json
{
  "type": "monster",
  "tile": 52,
  "variant": "spitter"
}
```

Pola terbaik:

- Pakai `legend` untuk tile umum: tanah, pohon, rintangan, koin, power-up kecil.
- Pakai `entities` untuk objek yang punya properti khusus: boss, checkpoint, NPC, trigger dialog, pintu, event.
- Jangan ubah arti kode lama setelah level pernah dibuat. Tambahkan kode baru agar level lama tetap aman.
- Simpan tiap level sebagai file sendiri: `level-1.json`, `level-2.json`, dan seterusnya.
