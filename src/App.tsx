import { HashRouter, Route, Routes } from "react-router-dom";
import { AppShell } from "./components/layout/AppShell";
import { AdminMode } from "./pages/AdminMode";
import { AttractionEditor } from "./pages/AttractionEditor";
import { AttractionWiki } from "./pages/AttractionWiki";
import { Home } from "./pages/Home";
import { Houses } from "./pages/Houses";
import { Rankings } from "./pages/Rankings";
import { ScareZones } from "./pages/ScareZones";
import { Settings } from "./pages/Settings";
import { Statistics } from "./pages/Statistics";
import { YearArchive } from "./pages/YearArchive";
import { YearEditor } from "./pages/YearEditor";
import { Years } from "./pages/Years";

function App() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<Home />} />
          <Route path="houses" element={<Houses />} />
          <Route path="scare-zones" element={<ScareZones />} />
          <Route path="years" element={<Years />} />
          <Route path="years/:eventYearId" element={<YearArchive />} />
          <Route path="rankings" element={<Rankings />} />
          <Route path="statistics" element={<Statistics />} />
          <Route path="settings" element={<Settings />} />
          <Route path="admin" element={<AdminMode />} />
          <Route path="admin/attractions/new" element={<AttractionEditor />} />
          <Route path="admin/attractions/:attractionId" element={<AttractionEditor />} />
          <Route path="admin/years/:eventYearId" element={<YearEditor />} />
          <Route path="attractions/:attractionId" element={<AttractionWiki />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}

export default App;
