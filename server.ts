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
const corsOptions = {
    origin: function (origin, callback) {
        return callback(null, true);
    },
    credentials: true
};
app.use("/", _cors(corsOptions));

/*********************************************************************************************************************************** */
//Route finali risposta al client
/*********************************************************************************************************************************** */
app.get("/api/richiesta1",async(req,res,next)=>{
    const client = new MongoClient(connectionString);
    await client.connect()//apre la connessione
    let nome:string=req["query"]["nome"]
    let collection:any = client.db(DBNAME).collection("unicorns");
    let rq:any=collection.findOne({"name":nome})
    rq.then((data)=>{
        res.send(data)
    })
    rq.catch((err)=>{
        res.status(500)
        res.send("Errore esecuzione query: "+err)
    })
    rq.finally(()=>{
        client.close()
    })
})

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

app.put("/api/:collection/:id",async(req,res,next)=>{
    let collection=req["params"].collection
    let id=req["params"]["id"]
    let objId
    if(ObjectId.isValid(id))
        objId=new ObjectId(req["params"].id)
    else
        objId=id as unknown as ObjectId
    let updatedRecord=req["body"]
    const client=new MongoClient(connectionString)
    await client.connect()
    let db=client.db(DBNAME).collection(collection)
    let request=db.replaceOne({"_id":objId},updatedRecord)
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