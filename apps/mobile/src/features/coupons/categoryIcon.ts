import {
  CoffeeIcon,
  BikeIcon,
  CactusIcon,
  FilmIcon,
  LeafIcon,
} from '@/shared/components/ui/Icons'

// Los cupones no traen ícono propio: se deriva de la categoría del comercio.
// Vive acá y no en una pantalla porque lo usan el catálogo y el home.
export function iconForCategory(cat: string | null) {
  switch (cat) {
    case 'Cafetería':
    case 'Cafeterías': return CoffeeIcon
    case 'Deportes': return BikeIcon
    case 'Plantas': return CactusIcon
    case 'Entretenimiento': return FilmIcon
    default: return LeafIcon
  }
}
