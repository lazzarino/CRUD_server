import _http from 'http'
import _url from 'url'
import _fs from 'fs'
import _express from 'express'
import _dotenv from 'dotenv'
import _cors from "cors";

//lettura delle password
_dotenv.config({"path":".env"})


//MongoDB ed express
import {MongoClient, ObjectId} from 'mongodb'

const DBNAME =process.env.DBNAME
const connectionString=process.env.connectionStringAtlas
const app=_express()


const port:number=parseInt(process.env.PORT)
let paginaErrore:any
const server:any=_http.createServer(app)


//se si specifica l'ip, si mette il server in ascolto su una singola interfaccia
//se viene omesso il server è in ascolto su tutte le 3 interfaccie (loopback,scheda ethernet, scheda wi-fi)

server.listen(port,()=>{
    init()
    console.log("Il server è attivo sulla porta: "+port)
})

function init(){
    _fs.readFile("./static/error.html",function(err,data){
        if(err)
            paginaErrore="<h1>Risorsa non trovata</h1>"
        else
            paginaErrore=data.toString()
    })
}


/********************************************************************************************************************************
 * ROUTES MIDDLEWARE
 * ****************************************************************************************************************/

//1. Request log
app.use("/",(req:any,res:any,next:any)=>{
    console.log("------> "+req.method+":"+req.originalUrl);
    next()
})


//2. Gestione risorse statiche
app.use("/",_express.static("./static"))


//3. Lettura parametri body
app.use("/",_express.json({"limit":"50mb"}))
app.use("/",_express.urlencoded({"limit":"50mb","extended":true}))

//4. Log parameters GET and POST
app.use("/",(req:any,res:any,next:any)=>{
    if(Object.keys(req["query"]).length>0)
        console.log("        "+JSON.stringify(req["query"]))
    if(Object.keys(req["body"]).length>0)
        console.log("        "+JSON.stringify(req["body"]))
    next()
})

// 5. Controllo degli accessi tramite CORS
/*const corsOptions = {
    origin: function (origin, callback) {
        return callback(null, true);
    },
    credentials: true
};
app.use("/", _cors(corsOptions));*/

const whitelist = [
    "http://my-crud-server.herokuapp.com ", // porta 80 (default)
    "https://my-crud-server.herokuapp.com ", // porta 443 (default)
    "http://localhost:3000",
    "https://localhost:3001",
    "http://localhost:4200", // server angular
    "https://cordovaapp", // porta 443 (default)
];
const corsOptions = {
    origin: function(origin, callback) {
    if (!origin) // browser direct call
    return callback(null, true);
    if (whitelist.indexOf(origin) === -1) {
    var msg = `The CORS policy for this site does not
    allow access from the specified Origin.`
    return callback(new Error(msg), false);
    }
    else
    return callback(null, true);
    },
    credentials: true
   };
app.use("/", _cors(corsOptions));
/*********************************************************************************************************************************** */
//Route finali risposta al client
/*********************************************************************************************************************************** */
app.get("/api/getCollections",async(req,res,next)=>{
    const client=new MongoClient(connectionString)
    await client.connect()
    let db=client.db(DBNAME)
    let request=db.listCollections().toArray()
    request.then((data)=>{
        res.send(data)
    })
    request.catch((err)=>{
        res.status(500).send("Errore lettura collezioni: "+err)
    })
    request.finally(()=>{
        client.close()
    })
})

app.get("/api/:collection",async(req,res,next)=>{
    let filters=req["query"]
    //console.log(filters)
    const client=new MongoClient(connectionString)
    await client.connect()
    let db=client.db(DBNAME).collection(req.params.collection)
    let request=db.find(filters).toArray()
    request.then((data)=>{
        res.send(data)
    })
    request.catch((err)=>{
        res.status(500).send("Errore lettura collezioni: "+err)
    })
    request.finally(()=>{
        client.close()
    })
})
app.get("/api/:collection/:id",async(req,res,next)=>{
    let collection=req["params"].collection
    let id=req["params"]["id"]
    let objId
    if(ObjectId.isValid(id))
    {
        objId=new ObjectId(req["params"].id)
    }
    else
        objId=id as unknown as ObjectId
    const client=new MongoClient(connectionString)
    await client.connect()
    let db=client.db(DBNAME).collection(collection)
    let request=db.findOne({"_id":objId})
    request.then((data)=>{
        res.send(data)
    })
    request.catch((err)=>{
        res.status(500).send("Errore esecuzione query: "+err)
    })
    request.finally(()=>{
        client.close()
    })
})
app.post("/api/:collection",async(req,res,next)=>{
    let collection=req["params"].collection
    let newRecord=req["body"]
    const client=new MongoClient(connectionString)
    await client.connect()
    let db=client.db(DBNAME).collection(collection)
    let request=db.insertOne(newRecord)
    request.then((data)=>{
        res.send(data)
    })
    request.catch((err)=>{
        res.status(500).send("Errore esecuzione query: "+err)
    })
    request.finally(()=>{
        client.close()
    })
})

app.delete("/api/:collection/:id",async(req,res,next)=>{
    let collection=req["params"].collection
    let id=req["params"]["id"]
    let objId
    if(ObjectId.isValid(id))
        objId=new ObjectId(req["params"].id)
    else
        objId=id as unknown as ObjectId
    const client=new MongoClient(connectionString)
    await client.connect()
    let db=client.db(DBNAME).collection(collection)
    let request=db.deleteOne({"_id":objId})
    request.then((data)=>{
        res.send(data)
    })
    request.catch((err)=>{
        res.status(500).send("Errore esecuzione query: "+err)
    })
    request.finally(()=>{
        client.close()
    })
})
app.delete("/api/:collection", async (req, res, next) => {
    let selectedCollection = req["params"].collection;
    let filters = req["body"];
    const client = new MongoClient(connectionString);
    await client.connect();
    let collection = client.db(DBNAME).collection(selectedCollection);
    let rq = collection.deleteMany(filters);
    rq.then((data) => res.send(data));
    rq.catch((err) => res.status(500).send(`Errore esecuzione query: ${err}`));
    rq.finally(() => client.close());
});

/*
    * Chiama il metodo PATCH con l'obbligo di specificare dentro il body la ACTION da eseguire
    * 
    * @remarks
    * Utilizzando questo metodo la PATCH risulta più flessibile
    * 
    * @param id - id del record
    * @body i nuovi valori da aggiornare, ad esempio: {"$inc":{"qta":1}}
    * @returns Un JSON di conferma aggiornamento
*/

app.patch("/api/:collection/:id",async(req,res,next)=>{
    let collection=req["params"].collection
    let id=req["params"]["id"]
    let objId
    if(ObjectId.isValid(id))
        objId=new ObjectId(req["params"].id)
    else
        objId=id as unknown as ObjectId
    let action=req["body"]
    const client=new MongoClient(connectionString)
    await client.connect()
    let db=client.db(DBNAME).collection(collection)
    let request=db.updateOne({"_id":objId},action)
    request.then((data)=>{
        res.send(data)
        console.log(data)
    })
    request.catch((err)=>{
        res.status(500).send("Errore esecuzione query: "+err)
    })
    request.finally(()=>{
        client.close()
    })
})

app.patch("/api/:collection", async (req, res, next) => {
    let selectedCollection = req["params"].collection;
    let filters = req["body"].filters;
    let action = req["body"].action;
    const client = new MongoClient(connectionString);
    await client.connect();
    let collection = client.db(DBNAME).collection(selectedCollection);
    let rq = collection.updateMany(filters, action);
    rq.then((data) => res.send(data));
    rq.catch((err) => res.status(500).send(`Errore esecuzione query: ${err}`));
    rq.finally(() => client.close());
});
/*
    * Chiama il metodo PUT aggiornato il record invece di sostuirlo 
    * 
    * @remarks
    * Utilizzando questo metodo la PUT esegue direttamente il SET del valore ricevuto:
    * 
    * @param id - id del record
    * @body i nuovi valori da aggiornare
    * @returns Un JSON di conferma aggiornamento
*/
app.put("/api/:collection/:id",async(req,res,next)=>{
    let collection=req["params"].collection
    let id=req["params"]["id"]
    let objId
    if(ObjectId.isValid(id))
        objId=new ObjectId(req["params"].id)
    else
        objId=id as unknown as ObjectId
    let newValues=req["body"]
    const client=new MongoClient(connectionString)
    await client.connect()
    let db=client.db(DBNAME).collection(collection)
    let request=db.updateOne({"_id":objId},{"$set":newValues})
    request.then((data)=>{
        res.send(data)
    })
    request.catch((err)=>{
        res.status(500).send("Errore esecuzione query: "+err)
    })
    request.finally(()=>{
        client.close()
    })
})
/***************************************************************************** *************************************************************/
//Default route e gestione degli errori
/************************************************************************************************************************************************ */
app.use("/",(req,res,next)=>{
    res.status(404)
    if(req.originalUrl.startsWith("/api/"))
        res.send("API non disponibile")
    else
        res.send(paginaErrore)
})
app.use("/",(err,req,res,next)=>{
    console.log("************* SERVER ERROR ***************\n", err.stack)
    res.status(500).send(err.message)
})