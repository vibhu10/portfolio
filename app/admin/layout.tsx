import './cms-panels.css';
import JarvisAdminLauncher from './JarvisAdminLauncher';
import BrandIconRepair from '../BrandIconRepair';
import AdminSessionGuardian from './AdminSessionGuardian';

export default function AdminLayout({children}:{children:React.ReactNode}){return <>{children}<AdminSessionGuardian/><BrandIconRepair/><JarvisAdminLauncher/></>}
