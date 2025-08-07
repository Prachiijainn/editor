import React from 'react';
import Avatar from 'react-avatar';

const Client = ({ username = "Guest" }) => {
    return (
        <div className="client">
            <Avatar name={username} size="40" round="10px" className="avatar"/>
            <span className="userName">{username}</span>
        </div>
    );
};

export default Client;

 
 