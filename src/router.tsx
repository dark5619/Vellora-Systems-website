import { createBrowserRouter } from 'react-router-dom';
import { Layout } from './components/Layout';
import { HomePage } from './pages/Home';
import { WorkPage } from './pages/Work';
import { StreamingCaseStudyPage } from './pages/StreamingCaseStudy';
import { ExpertisePage } from './pages/Expertise';
import { StudioPage } from './pages/Studio';
import { AboutPage } from './pages/About';
import { ContactPage } from './pages/Contact';
import { NotFoundPage } from './pages/NotFound';

export const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/work', element: <WorkPage /> },
      { path: '/work/streaming-platform', element: <StreamingCaseStudyPage /> },
      { path: '/expertise', element: <ExpertisePage /> },
      { path: '/studio', element: <StudioPage /> },
      { path: '/about', element: <AboutPage /> },
      { path: '/contact', element: <ContactPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
], {
  future: {
    v7_relativeSplatPath: true,
    v7_fetcherPersist: true,
    v7_normalizeFormMethod: true,
    v7_partialHydration: true,
    v7_skipActionErrorRevalidation: true,
  },
});
