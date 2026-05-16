import { HashRouter as Router, Navigate, Route, Routes } from "react-router-dom";
import Home from "@/pages/Home";
import Battle from "@/pages/Battle";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/battle" element={<Battle />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}
