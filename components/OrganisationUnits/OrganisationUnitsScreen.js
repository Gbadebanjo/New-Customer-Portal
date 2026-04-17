import classes from './organisationunits.module.css';
import NavbarComponent from "@/components/ui/Navbar/NavbarContainer";
import HomeIcon from "@/components/ui/icons/HomeIcon";
import Link from "next/link";
import RightSideComponent from "@/components/ui/rightside/RightSideComponent";
import ButtonFlexible from "@/components/ui/button-flexible/ButtonFlexible";
import PlusIcon from "@/components/ui/icons/PlusIcon";
import SearchIcon from "@/components/ui/icons/SearchIcon";
import ChevronDownIcon from "@/components/ui/icons/ChevronDownIcon";
import ActionsPopup from "@/components/ui/popups/ActionsPopup/ActionsPopup";
import getAllUserRoles from "@/lib/controllers/userRoles/getAllUserRoles"; // Import the image

export default async function OrganisationUnitsScreen() {
    const date = new Date();
    const thisYear = date.getFullYear();
    const {userRoles} = await getAllUserRoles();
    const NO_OF_COLUMNS = 2;
    return (
        <div className={classes.container}>
            {/* Header */}
            <div className={classes.header}>
               <span>
                   <Link href='/dashboard'>
                       <HomeIcon/>
                   </Link>
                 </span>
                <span> <small> | &nbsp; Admin  &nbsp; | &nbsp; Organisational Units &nbsp;</small> </span>

            </div>
            {/* Sidebar */}
            <div className={classes.nav}>
                <div className={classes.sidebar}>
                    {/* Sidebar Header */}
                    
                    {/* Sidebar Menu */}
                    <NavbarComponent/>
                </div>
            </div>
            {/* Content */}
            <div className={classes.content}>
                {/* Top Center */}
                <div className={classes.topCenter}>
                    <p className={classes.title}>Organisational Units</p>
                    <ButtonFlexible
                        link="#"
                        width={100}
                        height={40}
                        style={{
                            marginRight: 0,
                        }}
                    >
                        <PlusIcon/> New
                    </ButtonFlexible>
                </div>
                <div className={classes.centerContent}>
                    {/*search area*/}
                    <form>
                        <div
                            className={classes.searchArea}
                        >
                            <div
                                className={classes.searchTextInput}
                            >
                                {/* input text 1 */}
                                <div style={{
                                    id: 'input_1',
                                }}>
                                    <input
                                        type="text"
                                        className={classes.inputText}
                                        placeholder="Search"
                                        max={256}
                                        name="search"
                                        id="search"
                                    />
                                </div>
                            </div>
                            <div
                                className={classes.searchButton}
                            >
                                <ButtonFlexible
                                    link="#"
                                    width={50}
                                    height={50}
                                    style={{
                                        marginRight: 0,
                                    }}
                                >
                                    <SearchIcon/>
                                </ButtonFlexible>
                            </div>

                        </div>
                    </form>
                    <div className={classes.filterText}>
                            <span>
                                <small>
                                    Advanced Filters
                                </small>
                            </span>
                        <span>
                                <small>
                                <ChevronDownIcon/>
                                </small>
                                </span>
                    </div>
                    {/*Content*/}
                    <main className={classes.mainContent}>
                        <main className="ml-5 mr-5 mt-5">
                            <table
                                className='table table-bordered'
                                style={{
                                    width: 700,
                                }}
                            >
                                <thead>
                                <tr>
                                    <th>
                                        ACTIONS
                                    </th>
                                    <th>
                                        ROLE NAME
                                    </th>
                                </tr>
                                </thead>
                                <tbody>
                                {
                                    userRoles.length > 0 ?
                                        userRoles.map((myUserRole) => (
                                            <tr key={myUserRole.id}>
                                                <td>
                                                    {/* Use the ImportExportUsersComponent component */}
                                                    <ActionsPopup
                                                        menuItems={[
                                                            ['Edit', '/editLink'],
                                                            ['Set Password', '/setLink'],
                                                            ['Log in with this user', '/logLink'],
                                                            ['Delete', '/delLink']
                                                        ]}
                                                    />
                                                </td>
                                                <td>
                                                    {myUserRole.name}
                                                </td>
                                            </tr>
                                        ))
                                        : <tr
                                            style={{
                                                backgroundColor: '#0D202F',
                                                textAlign: 'center'
                                            }}
                                        >
                                            <td colSpan={NO_OF_COLUMNS}>No data available</td>
                                        </tr>
                                }

                                </tbody>


                            </table>
                        </main>
                    </main>
                    <div className={classes.copyright}>
                        {thisYear} © Daystar Power Energy Solutions
                    </div>
                </div>
            </div>
            {/* Right Side */}
            <RightSideComponent/>
        </div>
    );
}