import { Baby, Clapperboard, Building2, Pencil, Newspaper, FileText, Mail, GraduationCap, Palette, Telescope, CircuitBoard, Folder } from 'lucide-react'

const CATEGORIES = {
  baby_book:       { label: 'Baby Book',       Icon: Baby },
  home_movies:     { label: 'Home Movies',     Icon: Clapperboard },
  medical_records: { label: 'Medical Records', Icon: Building2 },
  school_papers:   { label: 'School Papers',   Icon: Pencil },
  newspaper:       { label: 'Newspaper',       Icon: Newspaper },
  documents:       { label: 'Documents',       Icon: FileText },
  letters:         { label: 'Letters',         Icon: Mail },
  high_school:     { label: 'High School',     Icon: GraduationCap },
  art:             { label: 'Art',             Icon: Palette },
  astro:           { label: 'Astro',           Icon: Telescope },
  electronics_diy: { label: 'Electronics & DIY', Icon: CircuitBoard },
}

export function categoryLabel(category) {
  return CATEGORIES[category]?.label || category
}

export function categoryIcon(category) {
  return CATEGORIES[category]?.Icon || Folder
}

// Series (page-numbered) collections count in "pages"; loose ones in "items".
export function collectionCount(collection) {
  const n = collection.item_count ?? 0
  return `${n} ${collection.is_series ? 'pages' : 'items'}`
}
