import { Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import ListingsPage from './features/listings/ListingsPage';
import GroupsPage from './features/groups/GroupsPage';
import SetupPage from './features/setup/SetupPage';
import GuidePage from './features/guide/GuidePage';
import ReceivePage from './features/receive/ReceivePage';
import SettingsPage from './features/settings/SettingsPage';
import NotFoundPage from './features/NotFoundPage';
import { ROUTES } from './routes';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path={ROUTES.listings} element={<ListingsPage />} />
        <Route path={ROUTES.groups} element={<GroupsPage />} />
        <Route path={ROUTES.setup} element={<SetupPage />} />
        <Route path={ROUTES.guide} element={<GuidePage />} />
        <Route path={ROUTES.settings} element={<SettingsPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
      {/* หน้ารับข้อมูลเปิดเป็นหน้าต่างแยกจาก bookmarklet จึงใช้ layout ย่อของตัวเอง */}
      <Route path={ROUTES.receive} element={<ReceivePage />} />
    </Routes>
  );
}
