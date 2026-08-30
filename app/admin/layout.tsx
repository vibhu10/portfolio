import './cms-panels.css';
import JarvisAdminLauncher from './JarvisAdminLauncher';
import BrandIconRepair from '../BrandIconRepair';

export default function AdminLayout({children}:{children:React.ReactNode}){return <>{children}<BrandIconRepair/><JarvisAdminLauncher/></>}
