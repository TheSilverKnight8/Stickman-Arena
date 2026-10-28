import { BrowserRouter, Navigate, Route, Routes } from 'react-router';
import { DialogHost } from './components/dialogs';
import { FighterHome } from './fighter/FighterPages';
import { useSettings } from './lib/settings';
import { Home } from './pages/Home';
import { SettingsPage } from './pages/Settings';
import { PazaakCpu, PazaakHome, PazaakRoomPage } from './pazaak/ui/PazaakPages';

export default function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/pazaak" element={<PazaakHome />} />
        <Route path="/pazaak/cpu" element={<PazaakCpu />} />
        <Route path="/pazaak/room" element={<PazaakRoomPage />} />
        <Route path="/pazaak/settings" element={<SettingsPage game="pazaak" />} />
        <Route path="/fighter" element={<FighterHome />} />
        <Route path="/fighter/settings" element={<SettingsPage game="fighter" />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <DialogHost />
      <Dimmer />
    </BrowserRouter>
  );
}

/** The brightness setting: a dark layer over everything that lets taps through. */
function Dimmer() {
  const { brightness } = useSettings();
  if (brightness >= 1) return null;
  return <div className="pointer-events-none fixed inset-0 z-[100] bg-black" style={{ opacity: 1 - brightness }} aria-hidden />;
}
