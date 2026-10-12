import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/*
  ScrollToTop — scrolls the window to the top when the route changes.

  Without this, navigating to a new page might leave you scrolled
  halfway down (wherever you were on the previous page).

  useLocation() changes every time the URL changes.
  useEffect runs the scroll whenever that happens.
*/
function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  // This component doesn't render anything visible
  return null;
}

export default ScrollToTop;
