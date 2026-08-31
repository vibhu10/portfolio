import './cms-panels.css';
import BrandIconRepair from '../BrandIconRepair';
import AdminSessionGuardian from './AdminSessionGuardian';
import AdminNavigationEnhancer from './AdminNavigationEnhancer';

export default function AdminLayout({children}:{children:React.ReactNode}){return <>{children}<AdminSessionGuardian/><BrandIconRepair/><AdminNavigationEnhancer/></>}
