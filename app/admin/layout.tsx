import './cms-panels.css';
import JarvisAdminLauncher from './JarvisAdminLauncher';

export default function AdminLayout({children}:{children:React.ReactNode}){return <>{children}<JarvisAdminLauncher/></>}
