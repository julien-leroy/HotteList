import {
  Baby, Bike, BookOpen, Camera, Car, ChefHat, Cookie, Dices, Dumbbell, Gamepad2, Gem, Gift, Hammer, Headphones, Lamp,
  Palette, PawPrint, Plane, Shirt, Smartphone, Sparkles, Sprout, Tent, Ticket, ToyBrick, Wine, type LucideIcon,
} from "lucide-react";

// Dessins des illustrations génériques (liste et couleurs : src/lib/gift-illustrations.ts).
// Icônes Lucide (licence ISC), au trait fin comme le cadeau par défaut des cartes.

const ICONS: Record<string, LucideIcon> = {
  surprise: Gift,
  livre: BookOpen,
  "jeu-video": Gamepad2,
  jouet: ToyBrick,
  "jeu-societe": Dices,
  "high-tech": Smartphone,
  musique: Headphones,
  photo: Camera,
  mode: Shirt,
  bijou: Gem,
  beaute: Sparkles,
  cuisine: ChefHat,
  gourmand: Cookie,
  apero: Wine,
  maison: Lamp,
  plante: Sprout,
  sport: Dumbbell,
  "plein-air": Tent,
  velo: Bike,
  voiture: Car,
  sortie: Ticket,
  voyage: Plane,
  creatif: Palette,
  bebe: Baby,
  animaux: PawPrint,
  bricolage: Hammer,
};

export function GiftIllustration({
  name,
  size = 88,
  color,
  strokeWidth = 1.1,
  className,
}: {
  name: string;
  size?: number;
  color: string;
  strokeWidth?: number;
  className?: string;
}) {
  const Icon = ICONS[name] ?? Gift;
  return <Icon size={size} color={color} strokeWidth={strokeWidth} absoluteStrokeWidth={false} className={className} aria-hidden="true" />;
}
