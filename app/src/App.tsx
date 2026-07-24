import { createBrowserRouter, Navigate, RouterProvider } from 'react-router'
import { Shell } from './components/shell/Shell'
import { AnalystPage } from './routes/analyst/AnalystPage'
import { CompanyPage } from './routes/company/CompanyPage'
import { PipelinePage } from './routes/pipeline/PipelinePage'

const router = createBrowserRouter([
  {
    path: '/',
    Component: Shell,
    children: [
      { index: true, element: <Navigate to="/pipeline" replace /> },
      { path: 'pipeline', Component: PipelinePage },
      { path: 'analyst', Component: AnalystPage },
      { path: 'company/:id', Component: CompanyPage },
      { path: '*', element: <Navigate to="/pipeline" replace /> },
    ],
  },
])

export default function App() {
  return <RouterProvider router={router} />
}
