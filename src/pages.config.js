import CreateSequence from './pages/CreateSequence';
import Dashboard from './pages/Dashboard';
import EmailSequences from './pages/EmailSequences';
import InviteUser from './pages/InviteUser';
import LeadDetails from './pages/LeadDetails';
import Leads from './pages/Leads';
import Members from './pages/Members';
import NewLead from './pages/NewLead';
import SequenceDetails from './pages/SequenceDetails';
import Settings from './pages/Settings';
import Reports from './pages/Reports';
import __Layout from './Layout.jsx';


export const PAGES = {
    "CreateSequence": CreateSequence,
    "Dashboard": Dashboard,
    "EmailSequences": EmailSequences,
    "InviteUser": InviteUser,
    "LeadDetails": LeadDetails,
    "Leads": Leads,
    "Members": Members,
    "NewLead": NewLead,
    "SequenceDetails": SequenceDetails,
    "Settings": Settings,
    "Reports": Reports,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};