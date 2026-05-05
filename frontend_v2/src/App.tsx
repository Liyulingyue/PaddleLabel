import { Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from './components/Layout';
import Welcome from './pages/Welcome';
import ProjectOverview from './pages/ProjectOverview';
import ProjectCreator from './pages/ProjectCreator';
import Detection from './pages/Detection';
import Classification from './pages/Classification';
import SemanticSegmentation from './pages/SemanticSegmentation';
import Ocr from './pages/Ocr';
import ML from './pages/ML';
import SampleProjects from './pages/SampleProjects';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<AppLayout />}>
        <Route index element={<Welcome />} />
        <Route path="welcome" element={<Welcome />} />
        <Route path="sample_projects" element={<SampleProjects />} />
        <Route path="sample_project" element={<SampleProjects />} />
        <Route path="project_overview" element={<ProjectOverview />} />
        <Route path="project_detail" element={<ProjectCreator />} />
        <Route path="project/create" element={<ProjectCreator />} />
        <Route path="classification" element={<Classification />} />
        <Route path="semantic_segmentation" element={<SemanticSegmentation />} />
        <Route path="instance_segmentation" element={<SemanticSegmentation />} />
        <Route path="detection" element={<Detection />} />
        <Route path="optical_character_recognition" element={<Ocr />} />
        <Route path="project_ai" element={<ML />} />
        <Route path="project_ocr_ai" element={<ML />} />
        <Route path="ml" element={<ML />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
