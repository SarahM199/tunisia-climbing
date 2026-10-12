/*
  Using Lucide icons — a free, well-designed icon library.
  "Mountain" gives us a proper mountain peak icon that
  actually looks good at any size.

  Browse all icons at: https://lucide.dev/icons
*/
import { Mountain } from "lucide-react";

function BrandIcon({ size = 22, color = "var(--sea)" }) {
  return <Mountain size={size} color={color} />;
}

export default BrandIcon;
