import { Routes, Route } from 'react-router-dom';
import AppLayout from './components/Layout';
import Welcome from './pages/Welcome';
import ProjectOverview from './pages/ProjectOverview';
import ProjectCreator from './pages/ProjectCreator';
import Detection from './pages/Detection';
import Classification from './pages/Classification';
import SemanticSegmentation from './pages/SemanticSegmentation';
import Ocr from './pages/Ocr';
import ML from './pages/ML';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<AppLayout />}>
        <Route index element={<Welcome />} />
        <Route path="project/create" element={<ProjectCreator />} />
        <Route path="project/:id" element={<ProjectOverview />} />
        <Route path="project/:id/label/classification" element={<Classification />} />
        <Route path="project/:id/label/detection" element={<Detection />} />
        <Route path="project/:id/label/semantic_segmentation" element={<SemanticSegmentation />} />
        <Route path="project/:id/label/instance_segmentation" element={<Detection />} />
        <Route path="project/:id/label/ocr" element={<Ocr />} />
        <Route path="project/:id/label/point" element={<Detection />} />
        <Route path="project/:id/ml" element={<ML />} />
      </Route>
    </Routes>
  );
}
