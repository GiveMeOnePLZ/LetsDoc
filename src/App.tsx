import { useState } from 'react';
import AppLayout from './layouts/AppLayout';
import type { TemplateData } from './types';
import './App.css';

function App() {
  const [template, setTemplate] = useState<TemplateData | null>(null);

  const handleTemplateLoaded = (t: TemplateData) => {
    setTemplate(t);
  };

  return (
    <AppLayout
      template={template}
      onTemplateLoaded={handleTemplateLoaded}
      onTemplateCleared={() => setTemplate(null)}
      onTemplateSaved={() => {}}
    />
  );
}

export default App;
