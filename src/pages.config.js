import Dashboard from './pages/Dashboard';
import Leads from './pages/Leads';
import LeadDetails from './pages/LeadDetails';
import NewLead from './pages/NewLead';
import Members from './pages/Members';
import Settings from './pages/Settings';
import InviteUser from './pages/InviteUser';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Dashboard": Dashboard,
    "Leads": Leads,
    "LeadDetails": LeadDetails,
    "NewLead": NewLead,
    "Members": Members,
    "Settings": Settings,
    "InviteUser": InviteUser,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};