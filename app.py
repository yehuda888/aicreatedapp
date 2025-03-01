from flask import Flask, render_template, request
from flask_socketio import SocketIO, join_room, leave_room
import time

app = Flask(__name__)
socketio = SocketIO(app, cors_allowed_origins="*")

# Track active calls
active_calls = {}

@socketio.on("connect")
def handle_connect():
    join_room(request.sid)
    socketio.emit("your-id", request.sid, room=request.sid)
    print(f"Client connected: {request.sid}")

@socketio.on("disconnect")
def handle_disconnect():
    user_id = request.sid
    leave_room(user_id)
    
    # Clean up any active calls
    if user_id in active_calls:
        partner_id = active_calls[user_id]["partner"]
        socketio.emit("end-call", {
            "reason": "user_disconnected",
            "target_id": partner_id
        }, room=partner_id)
        
        # Remove both users from active calls
        if partner_id in active_calls:
            del active_calls[partner_id]
        del active_calls[user_id]
        
    print(f"Client disconnected: {user_id}")

@socketio.on("message")
def handle_message(data):
    try:
        socketio.emit("message", data, skip_sid=request.sid)
    except Exception as e:
        print(f"Error in handle_message: {e}")
        socketio.emit("error", {"message": "Failed to send message"}, room=request.sid)

@socketio.on("image")
def handle_image(data):
    try:
        socketio.emit("image", data, skip_sid=request.sid)
    except Exception as e:
        print(f"Error in handle_image: {e}")
        socketio.emit("error", {"message": "Failed to send image"}, room=request.sid)

@socketio.on("audio")
def handle_audio(data):
    try:
        sender_id = request.sid
        target_id = data.get("target_id")
        
        if not target_id:
            raise ValueError("No target_id specified for audio message")
            
        # Forward audio data to target user
        audio_message = {
            "sender_id": sender_id,
            "audio_data": data.get("audio_data"),
            "timestamp": data.get("timestamp")
        }
        
        socketio.emit("audio", audio_message, room=target_id)
        print(f"Audio message forwarded from {sender_id} to {target_id}")
        
    except Exception as e:
        print(f"Error in handle_audio: {e}")
        socketio.emit("error", {"message": "Failed to send audio"}, room=request.sid)

@socketio.on("start-call")
def handle_start_call(data):
    try:
        caller_id = request.sid
        callee_id = data["callee_id"]
        
        # Prevent duplicate calls
        if caller_id in active_calls or callee_id in active_calls:
            socketio.emit("error", {
                "message": "One of the users is already in a call"
            }, room=caller_id)
            return
        
        # Store call information
        active_calls[caller_id] = {
            "partner": callee_id,
            "state": "calling",
            "username": data.get("caller_username", caller_id)
        }
        
        # Add call metadata
        data.update({
            "caller_id": caller_id,
            "caller_username": data.get("caller_username", caller_id),
            "timestamp": data.get("timestamp", time.time())
        })
        
        print(f"Starting call: {caller_id} -> {callee_id}")
        socketio.emit("start-call", data, room=callee_id)
        
    except Exception as e:
        print(f"Error in handle_start_call: {e}")
        socketio.emit("error", {"message": "Failed to start call"}, room=request.sid)

@socketio.on("answer-call")
def handle_answer_call(data):
    try:
        callee_id = request.sid
        caller_id = data["caller_id"]
        
        # Update active calls for both users
        active_calls[callee_id] = {
            "partner": caller_id,
            "state": "connected"
        }
        
        if caller_id in active_calls:
            active_calls[caller_id]["state"] = "connected"
            active_calls[caller_id]["partner"] = callee_id
        
        # Add caller/callee usernames if missing
        if "caller_username" not in data:
            data["caller_username"] = caller_id
        if "callee_username" not in data:
            data["callee_username"] = callee_id
            
        data["callee_id"] = callee_id
        socketio.emit("answer-call", data, room=caller_id)
        
    except Exception as e:
        print(f"Error in handle_answer_call: {e}")
        socketio.emit("error", {"message": "Failed to answer call"}, room=request.sid)

@socketio.on("ice-candidate")
def handle_ice_candidate(data):
    try:
        socketio.emit("ice-candidate", data, room=data["target_id"])
    except KeyError:
        print(f"ICE candidate error: target_id {data['target_id']} not found")

@socketio.on("end-call")
def handle_end_call(data):
    try:
        caller_id = request.sid
        target_id = data.get("target_id")
        
        # Preserve usernames from active calls if available
        if caller_id in active_calls and "username" in active_calls[caller_id]:
            data["caller_username"] = active_calls[caller_id]["username"]
        if target_id in active_calls and "username" in active_calls[target_id]:
            data["callee_username"] = active_calls[target_id]["username"]
            
        # Emit end call event to target
        socketio.emit("end-call", data, room=target_id)
        
        # Clean up active calls
        if caller_id in active_calls:
            del active_calls[caller_id]
        if target_id in active_calls:
            del active_calls[target_id]
            
        print(f"Call ended between {data.get('caller_username', caller_id)} and {data.get('callee_username', target_id)}")
        
    except Exception as e:
        print(f"Error in handle_end_call: {e}")
        socketio.emit("error", {"message": "Failed to end call"}, room=request.sid)

@socketio.on_error()
def error_handler(e):
    print(f"Socket.IO error: {e}")

@app.route("/")
def index():
    return render_template("message.html")

if __name__ == "__main__":
    socketio.run(app, debug=True, log_output=True)