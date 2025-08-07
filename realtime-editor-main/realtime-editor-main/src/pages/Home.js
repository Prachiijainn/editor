import React , {useState} from 'react';
import{v4 as uuidV4} from 'uuid';
import {useNavigate} from 'react-router-dom';
import toast from 'react-hot-toast';


const Home = (e) => {
  const navigate=useNavigate();
  const[roomId, setRoomId] = useState('');
  const[username, setusername] = useState('');
  const createNewRoom =(e) => {
    e.preventDefault();
    const id= uuidV4();
    setRoomId(id);
    toast.success('Created a new room');
    
  };

  const joinRoom = () => {
    if (!roomId || !username) {
      toast.error('ROOM ID & username is required');
      return;
  }
    navigate(`/editor/${roomId}`,{
      state : {
        username,
      }
    })
  };


  const handleInputEnter = (e) =>{
    if(e.code ==='enter'){
    joinRoom();
  }
}
  

  return (
    <div className="homePageWrapper">
      <div className="formWrapper">
      <img className="homePageLogo"  
      src="/NadeX.png" alt="NadeX-logo" />
      <h4 className="mainlable"> Paste your INVITATION CODE</h4>

      

      <div className="inputGroup">
        <input type="text" 
        className="inputBox"
         placeholder="ROOM ID" 
        onChange={(e)=> setRoomId (e.target.value)}
        value = {roomId }
        onKeyUp={handleInputEnter}
        
        />
        <input type="text"
        className="inputBox" 
        placeholder="USERNAME"
        onChange={(e)=> setusername (e.target.value)}
        value = {username}
        onKeyUp={handleInputEnter}
         />

      


        <button className="btn joinBtn" onClick={joinRoom}>JOIN</button>
        <span className="createInfo">
              If you don't have an invite, then create&nbsp;
              <a onClick={createNewRoom} href="" className="craeteNewBtn">
                NEW ROOM 
                </a>
        </span>
      </div>
      </div>
      <footer>
        <h4>Build with 💕 by NadeX. &nbsp;🕹️: &nbsp;
          <a href="https://discord.gg/r5bpVWYvxs">NadeX</a>
        </h4>
      </footer>
    </div>
  );
};

export default Home ;
  