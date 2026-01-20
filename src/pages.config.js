import Dashboard from './pages/Dashboard';
import Leads from './pages/Leads';
import LeadDetails from './pages/LeadDetails';
import NewLead from './pages/NewLead';
import Members from './pages/Members';
import Settings from './pages/Settings';
import InviteUser from './pages/InviteUser';
import EmailSequences from './pages/EmailSequences';
import CreateSequence from './pages/CreateSequence';
import SequenceDetails from './pages/SequenceDetails';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Dashboard": Dashboard,
    "Leads": Leads,
    "LeadDetails": LeadDetails,
    "NewLead": NewLead,
    "Members": Members,
    "Settings": Settings,
    "InviteUser": InviteUser,
    "EmailSequences": EmailSequences,
    "CreateSequence": CreateSequence,
    "SequenceDetails": SequenceDetails,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};