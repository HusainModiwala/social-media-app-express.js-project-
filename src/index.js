import connectDB from "./db/index.js";
import app from "./app.js";

connectDB()
.then(() => {
    const PORT = Number(process.env.PORT) || 8000;
    app.listen(PORT, () => {
        console.log(`App is listening on port ${PORT}`);
    })
})
.catch((err)=>{
    console.log("Mongo Db Connection Failed..", err);
    process.exit(1);
})