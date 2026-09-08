import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, "Sender name is required"],
        trim: true,
    },
    email: {
        type: String,
        required: [true, "Email address is required"],
        trim: true,
    },
    phone: {
        type: String,
        required: [true, "Phone number is required"],
        trim: true,
    },
    subject: {
        type: String,
        trim: true,
        default: "General Inquiry",
    },
    message: {
        type: String,
        required: [true, "Message body is required"],
        trim: true,
    }
}, {
    timestamps: true
});

const Message = mongoose.model("Message", messageSchema);
export default Message;
