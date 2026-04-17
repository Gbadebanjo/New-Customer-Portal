'use client'
import classes from './SupportDetailsClient.module.css';
import { Fragment, useState } from "react";
import Link from 'next/link';
import { normalizeString } from "@/utils/constants";
import { ButtonSaveSubmit } from "@/components/ui/ButtonSaveAndSubmit/ButtonSaveAndSubmit";
import NewTagButton from "@/components/ui/tags/NewTagButton";
import ActiveTagButton from "@/components/ui/tags/ActiveTagButton";
import ResolvedTagButton from "@/components/ui/tags/ResolvedTagButton";
import ReopenedTagButton from "@/components/ui/tags/ReopenedTagButton";
import ChevronLeft from '@/components/ui/icons/ChevronLeft';
import { FaCheck } from "react-icons/fa";
import AddSupportMessage from '@/lib/controllers/supportQuery/AddSupportMessage';
import ResolveSupportQueryById from '@/lib/controllers/supportQuery/ResolveSupportQueryById';
import { useUser } from '../Context/userContext';

export default function SupportDetailsClient({ allSupportQueryStatuses, allSupportQueryCategories, supportQueryById }) {
    const [response, setResponse] = useState("");
    const [loading, setLoading] = useState(false);
    const { user } = useUser();

    function getSupportStatusById(status_id) {
        // alert("getSupportStatusById received status_id:"+ JSON.stringify(status_id)); // Add this line
        let output = '';
        const statusObject = allSupportQueryStatuses.find(status => status.id === status_id);
        if (statusObject) {
            output = normalizeString(statusObject.name);

            switch (output) {
                case 'New':
                    return <NewTagButton />;
                case 'Active':
                    return <ActiveTagButton />;
                case 'Resolved':
                    return <ResolvedTagButton />;
                case 'Reopened':
                    return <ReopenedTagButton />;
                default:
                    return null;
            }

        } else {
            return "";
        }
    }

    function getSupportCategoryById(category_id) {
        const categoryObject = allSupportQueryCategories?.find(category => category.id === category_id);
        if (categoryObject) {
            return normalizeString(categoryObject.name);
        } else {
            return "";
        }
    }

    const handleAddSupportQuery = async (e) => {
        e.preventDefault();

        try {
            await AddSupportMessage({
                support_query_id: supportQueryById?.supportQuery.id,
                user_id: user.id,
                response,
            });
            setResponse("");
        } catch (error) {
            console.log('Failed to send query message', error);
        }

    };

    const handleResolve = async () => {
        if (!supportQueryById?.supportQuery.id) return;

        try {
            setLoading(true);
            await ResolveSupportQueryById(supportQueryById?.supportQuery.id);
        } catch (error) {
            console.log('Failed to resolve support query', error);
        } finally {
            setLoading(false);
        }
    };



    // Set up loading state and loader in place of this
    if (!supportQueryById?.supportQuery) {
        return <div className={classes.Content}>Loading…</div>;
    }

    return (
        <div className={classes.Content}>
            <div className={classes.header}>
                <h1 className={classes.title}>
                    {supportQueryById?.supportQuery.title}
                </h1>
                <Link href='/support' className={classes.backLink}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', marginRight: 4 }}>
                        <ChevronLeft />
                    </span>
                    Back to Support
                </Link>
            </div>
            <div className={classes.container}>
                <div className={classes.left}>
                    <h2 className={classes.blueTitle}>Send Message</h2>
                    <div className={classes.leftContainer}>
                        <div className={classes.flex}>
                            <h1 className={classes.text}>Status</h1>
                            <div>{getSupportStatusById(supportQueryById?.supportQuery.status_id)}</div>
                        </div>
                        <div className={classes.flex}>
                            <h1 className={classes.text}>Senders email</h1>
                            <p className={classes.textDetails}>{supportQueryById?.supportQuery?.user?.email}</p>
                        </div>
                        <div className={classes.flexCol}>
                            <h1 className={classes.text}>Category</h1>
                            <p className={classes.detailContainer}>{getSupportCategoryById(supportQueryById?.supportQuery?.category_id)}</p>
                        </div>
                        <div className={classes.flexCol}>
                            <h1 className={classes.text}>Title</h1>
                            <p className={classes.detailContainer}>{supportQueryById?.supportQuery.title}</p>
                        </div>
                        <div className="py-4">
                            <form onSubmit={handleAddSupportQuery}>
                                <input type="hidden" name="support_query_id" value={supportQueryById?.supportQuery.id} />
                                <input type="hidden" name="user_id" value={supportQueryById?.supportQuery?.user?.id} />

                                <label className="form-control w-full" style={{ marginBottom: '20px', maxWidth: '133%' }}>
                                    <div className="label">
                                        <span className="label-text">Response</span>
                                    </div>
                                    <textarea
                                        className="textarea textarea-bordered w-full"
                                        id="response"
                                        name="response"
                                        value={response}
                                        required
                                        onChange={(e) => setResponse(e.target.value)}
                                        style={{
                                            backgroundColor: '#123751',
                                            borderColor: '#123751'
                                        }}
                                    />
                                </label>

                                <div className="modal-action">
                                    <div className={classes.flex}>
                                        <div style={{ marginLeft: 5 }}>
                                            <ButtonSaveSubmit buttonText="Send Message" type="submit" />
                                        </div>
                                    </div>
                                </div>
                            </form>

                        </div>
                    </div>
                </div>
                <div className={classes.right}>
                    <h2 className={classes.blueTitle}>History</h2>
                    <div className={classes.rightContainer}>
                        {supportQueryById.supportQuery.messages?.length > 0 ? (
                            supportQueryById.supportQuery.messages.map((msg) => (
                                <Fragment key={msg.id}>
                                    <div className={classes.messageContainer}>
                                        <div className={classes.flexDistance}>
                                            <h3 className={classes.sender}> {msg.user ? `${msg.user.email}` : 'Unknown'}</h3>
                                            <span className={classes.date}>{msg.created_at ? new Date(msg.created_at).toLocaleString() : ''}</span>
                                        </div>
                                        <p className={classes.message}>{msg.message}</p>
                                    </div>
                                </Fragment>
                            ))
                        ) : (
                            <p className={classes.textDetails}>No messages yet.</p>
                        )}
                        <div className={classes.fixedResolve}>
                            <button type="button" className={classes.resolveButton} onClick={handleResolve}>
                                <FaCheck />
                                {/* Resolve this query */}
                                <span style={{ marginLeft: 8 }}>{loading ? 'Resolving…' : 'Resolve this query'}</span>
                            </button>
                        </div>
                        {/* </div> */}

                    </div>
                </div>
            </div>
        </div>
    );
}
