import './globals.css';

export const metadata={title:'Vibhu Growth OS',description:'AI job, client and outreach command center'};

export default function RootLayout({children}:{children:React.ReactNode}){
 return <html lang='en'><body>{children}</body></html>;
}
