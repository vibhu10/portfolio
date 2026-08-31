import './cms-panels.css';
import JarvisAdminLauncher from './JarvisAdminLauncher';
import BrandIconRepair from '../BrandIconRepair';
import AdminSessionGuardian from './AdminSessionGuardian';
import ThemeManager from './ThemeManager';

export default function AdminLayout({children}:{children:React.ReactNode}){return <>{children}<AdminSessionGuardian/><BrandIconRepair/><ThemeManager/><JarvisAdminLauncher/></>}
