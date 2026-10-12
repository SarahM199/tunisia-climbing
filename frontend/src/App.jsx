import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import ScrollToTop from "./components/ScrollToTop";
import CragList from "./pages/CragList";
import CragDetail from "./pages/CragDetail";
import Recommend from "./pages/Recommend";
import AllRoutes from "./pages/AllRoutes";
import NotFound from "./pages/NotFound";
import MapView from "./pages/MapView";
import SectorDetail from "./pages/SectorDetail";
import { AuthProvider } from "./context/AuthContext";
import Login from "./pages/Login";
import Register from "./pages/Register";
import About from "./pages/About";
import Contact from "./pages/Contact";


import "./App.css";

function App() {
  return (
    <BrowserRouter>
      {/* AuthProvider must wrap everything that needs to know who's logged in */}
      <AuthProvider>
        <ScrollToTop />
        <Layout>
          <Routes>
            <Route path="/" element={<CragList />} />
            <Route path="/crags/:cragId" element={<CragDetail />} />
            <Route path="/sectors/:sectorId" element={<SectorDetail />} />
            <Route path="/recommend" element={<Recommend />} />
            <Route path="/routes" element={<AllRoutes />} />
            <Route path="/map" element={<MapView />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Layout>
      </AuthProvider>
    </BrowserRouter>
  );
}


export default App;
