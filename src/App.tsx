import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Search from './pages/Search';
import Lists from './pages/Lists';
import ListDetails from './pages/ListDetails';
import Analytics from './pages/Analytics';

function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Search />} />
          <Route path="/Lists" element={<Lists />} />
          <Route path="/ListDetails" element={<ListDetails />} />
          <Route path="/Analytics" element={<Analytics />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;
