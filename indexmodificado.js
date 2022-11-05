/* 
estado de la app (validaciones y testeo):
- CATEGORIA:
    - GET: 
    - GET + id: 
    - POST: 
    - DELETE: 

- LIBRO:
    - GET:
    - GET + id:
    - POST:
    - PUT:
    - DELETE:
    
- PERSONA:
    - GET:
    - GET + id:
    - POST:
    - DELETE:
*/

/* ========== REQUIRES ========== */
const express = require('express');
const mysql = require('mysql');
const { features } = require('process');
const util = require('util');
const cors = require ('cors');
const jwt=require('jsonwebtoken');

const app = express();
const port = 3005;

app.use(cors())

app.use(express.json());
// app.use(express.urlencoded({ extended: true }));

/* ========== MYSQL ========== */
// Para trabajar con base de datos mysql
const conexion = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'mybs'
});

conexion.connect((error) => {
    if (error) {
        throw error;
    }

    console.log('Conexion con base de datos mysql establecida');
});

const utilQuery = util.promisify(conexion.query).bind(conexion);

/* ========== DOCUMENTACION API ========== */
// - 1) Categoria
// - 2) Libro
// - 3) Persona


/* ===== 3) PERSONA ===== */
// GET personas
app.get('/persona', async (req, res) => {
    try {
        const query = 'SELECT * FROM persona';

        const respuesta = await utilQuery(query);

        res.status(200).send({ "respuesta": respuesta });
    }

    catch (e) {
        console.error(e.message);
        res.status(413).send({ "mensaje": e.message })
    }
});
// GET una sola persona
app.get('/persona/:id', async (req, res) => {
    try {
        const query = 'SELECT * FROM persona WHERE id = ?';

        const respuesta = await utilQuery(query, [req.params.id]);

        // verifica si la persona existe
        if (respuesta.length === 0) {
            throw new Error("No se encuentra esa persona");
        }

        res.status(200).send({ "respuesta": respuesta });
    }

    catch (e) {
        console.error(e.message);
        res.status(413).send({ "mensaje": e.message })
    }
});
// POST persona
app.post('/login', (req,res) =>{
    if (!req.body.user  ||  !req.body.pass) {
     
     res.send({error: "no mando todos los datos"})
     return; // colocamos el return para que deje de ejecutar
    }
 
 
     /** EL TOKEN DE SEGURIDAD 
    * El token tiene un margen de tiempo - por ej. para el banco el token dure un tiempo determinado para la seguridad 
    * EL TOKEN tiene diferentes partes  tokenData, que es la info que viaja al cliente, el tiempo
    *
    */
 
    if (req.body.nombre=='cris' && req.body.pass=='123' ){
     const tokenData={
         nombre:'jose',
         apellido:'ruiz'
         }
 
     const token =jwt.sign(tokenData, 'Secret',{
         expiresIn: 60*60*24 //expira en 24 horas
     })
     res.send({token})
    }
    else{
     res.send({error: "los datos no son los correctos"})
     return; // colocamos el return para que deje de ejecutar
    }
 
 })
 
 app.get('/producto', (req,res)=>{
     let token =req.headers['authorization']
 if(!token){
     console.log('error');
 
 }
 token =token.replace('Bearer ', '')
 jwt.verify(token, 'Secret', (err,user) =>{
     if(err){
         res.status(401).send({error:'TOKEN INVALIDO'})
     }else{
         console.log('ESTO ES USER ',user)
         res.send({message:'AWWWWWW YEAH'})
     }
 })
 })
 

app.post('/persona', async (req, res) => {

    try {
        // valida datos obligatorios
        if (!req.body.nombre || !req.body.apellido || !req.body.alias || !req.body.email) {
            throw new Error("Faltan datos, todos los campos son obligatorios");
        }

        // valida que no se ingrese un nombre en blanco
        if (/^\s+$/.test(req.body.nombre) || /^\s+$/.test(req.body.apellido) || /^\s+$/.test(req.body.alias) || /^\s+$/.test(req.body.email)) {
            throw new Error("No es posible ingresar solo espacios en blanco");
        }

        // valida que el email sea unico
        let query = 'SELECT email FROM persona WHERE email = ?';

        let respuesta = await utilQuery(query, [req.body.email]);

        if (respuesta.length > 0) {
            throw new Error("El email ya se encuentra registrado");
        }


        // strings toUpperCase
        const nombre = req.body.nombre.toUpperCase();
        const apellido = req.body.apellido.toUpperCase();
        const alias = req.body.alias.toUpperCase();
        const email = req.body.email.toUpperCase();

        // Inserta registro de persona en la BD
        query = 'INSERT INTO persona (nombre, apellido, alias, email) VALUES (?, ?, ?, ?)';
        respuesta = await utilQuery(query, [nombre, apellido, alias, email]);

        res.status(200).send({ "nombre": nombre, "apellido": apellido, "alias": alias, "email": email });
    }

    catch (e) {
        // el if convierte el mensaje de error del sistema en uno reconocible para el usuario
        if (e.code === 'ER_DUP_ENTRY') {
            console.error(e.message);
            res.status(413).send("El email ya se encuentra registrado");
        } else {
            console.error(e.message);
            res.status(413).send({ "mensaje": e.message })
        }
    }
});
// PUT persona
app.put('/persona/:id', async (req, res) => {
    try {
        // Verifica datos ingresados: ID libro y datos obligatorios
        if (!req.params.id || !req.body.nombre || !req.body.apellido || !req.body.alias || !req.body.email) {
            throw new Error("Es necesario que se ingresen correctamente el ID de la persona y los datos correspondientes");
        }

        // valida que no se ingresen datos en blanco
        if (/^\s+$/.test(req.body.nombre) || /^\s+$/.test(req.body.apellido) || /^\s+$/.test(req.body.alias) || /^\s+$/.test(req.body.email)) {
            throw new Error("No es posible ingresar datos solo con espacios en blanco");
        }

        // valida que el id corresponda a una persona existente
        let query = 'SELECT id FROM persona WHERE id = ?';

        let respuesta = await utilQuery(query, [req.params.id]);

        if (respuesta == 0) {
            throw new Error("No existe esa persona");
        }

        // valida que el email sea unico
        query = 'SELECT email FROM persona WHERE email = ?';

        respuesta = await utilQuery(query, [req.body.email]);

        if (respuesta > 0) {
            throw new Error("El email ya se encuentra registrado");
        }

        // strings toUpperCase
        const nombre = req.body.nombre.toUpperCase();
        const apellido = req.body.apellido.toUpperCase();
        const alias = req.body.alias.toUpperCase();
        const email = req.body.email.toUpperCase();


        // update de la BD
        query = 'UPDATE persona SET nombre = ?, apellido = ?, alias = ?, email = ? WHERE id = ?';

        respuesta = await utilQuery(query, [nombre, apellido, alias, email, req.params.id]);

        res.status(200).send({ "nombre": nombre, "apellido": apellido, "alias": alias, "email": email });
    }

    catch (e) {
        // el if convierte el mensaje de error del sistema en uno reconocible para el usuario
        if (e.code === 'ER_DUP_ENTRY') {
            console.error(e.message);
            res.status(413).send("El email ya se encuentra registrado");
        } else {
            console.error(e.message);
            res.status(413).send({ "mensaje": e.message })
        }
    }
});
// DELETE persona
app.delete('/persona/:id', async (req, res) => {
    try {
        //Valida que la persona este registrada
        let query = 'SELECT * FROM persona WHERE id = ?';

        let respuesta = await utilQuery(query, [req.params.id]);

        if (respuesta.length == 0) {
            throw new Error("Esa persona no existe");
        }

        // Valida si la persona tiene libros asociados
        query = 'SELECT persona_id FROM libro WHERE id = ?';

        respuesta = await utilQuery(query, [req.params.id]);

        if (respuesta == req.params.id) {
            throw new Error("Esa persona tiene libros asociados, no se puede eliminar");
        }

        // borrar el registro de la persona de la BD
        query = 'DELETE FROM persona WHERE id = ?';

        respuesta = await utilQuery(query, [req.params.id]);

        res.status(200).send("El registro se borro correctamente");
    }
    catch (e) {
        console.error(e.message);
        res.status(413).send({ "mensaje": e.message })
    }
});


/** FUNCIONES */
 function noEncontrado(r){
      if (r.length === 0) {
            throw new Error("Categoria no encontrada");
        }
 }


/* ========== SERVIDOR ========== */
app.listen(port, (req, res) => console.log("Server listening on port " + port));