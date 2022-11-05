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
require('dotenv').config();
const mysql = require('mysql');
const { features } = require('process');
const util = require('util');
const cors = require ('cors');


const app = express();
const port = 3005;

app.use(cors())

app.use(express.json());
// app.use(express.urlencoded({ extended: true }));

/* ========== MYSQL ========== */
// Para trabajar con base de datos mysql
const conexion = mysql.createConnection({
    host: process.env.HOST,
    user: process.env.USER,
    password: process.env.PASSWORD,
    database: process.env.DATABASE
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

/* ===== 1) CATEGORIA ===== */
// GET para todas las categorias
app.get('/categoria', async (req, res) => {
    try {
        const query = 'SELECT * FROM categoria';

        const respuesta = await utilQuery(query);

        res.status(200).send({ "respuesta": respuesta });
    }
    catch (e) {
        console.error(e.message);
        res.status(413).send({ "mensaje": e.message })
    }
});
// GET para solo una categoria
app.get('/categoria/:id', async (req, res) => {
    try {
        const query = 'SELECT * FROM categoria WHERE id = ?';

        const respuesta = await utilQuery(query, [req.params.id]);

        // verifica si la categoria existe
        noEncontrado(respuesta);
        // if (respuesta.length === 0) {
        //     throw new Error("Categoria no encontrada");
        // }

        res.status(200).send({ "respuesta": respuesta });
    }
    catch (e) {
        console.error(e.message);
        res.status(413).send({ "mensaje": e.message })
    }
});
// POST para agregar una categoria
app.post('/categoria', async (req, res) => {
    try {
        // verifica si se agregó un nombre
        if (!req.body.nombre_categoria) {
            throw new Error("Debes enviar un nombre para agregar una categoria!");
        }

        // valida que no se ingrese un nombre en blanco
        if (/^\s+$/.test(req.body.nombre_categoria)) {
            throw new Error("No es posible ingresar solo espacios en blanco en el nombre de la categoria");
        }
        const nombreUpperCased = req.body.nombre_categoria.toUpperCase();

        // verifica si el nombre ya existe
        let query = 'SELECT nombre_categoria FROM categoria WHERE nombre_categoria = ?';

        let respuesta = await utilQuery(query, nombreUpperCased);

        if (respuesta.length > 0) {
            throw new Error("Ese nombre de categoria ya existe!");
        }

        // ingresa categoria a la BD
        query = 'INSERT INTO categoria (nombre_categoria) VALUES (?)';

        respuesta = await utilQuery(query, nombreUpperCased);

        res.status(200).send({ "respuesta": respuesta.insertId, "nombre": nombreUpperCased });
    }
    catch (e) {
        console.error(e.message);
        res.status(413).send({ "mensaje": e.message })
    }
});
// DELETE una categoria
app.delete('/categoria/:id', async (req, res) => {
    try {
        // verifica si la categoria existe o no
        let query = 'SELECT id FROM categoria WHERE id = ?';

        let respuesta = await utilQuery(query, [req.params.id]);

        if (respuesta.length === 0) {
            throw new Error("No existe la categoria indicada");
        }
        // verifica si tiene libros asociados
        query = 'SELECT categoria_id FROM libro WHERE categoria_id = ?'

        respuesta = await utilQuery(query, [req.params.id]);

        if (respuesta.length > 0) {
            throw new Error("Esa categoria aún tiene libros asociados! No se puede eliminar");
        }

        // delete
        query = 'DELETE FROM categoria WHERE id = ?';
        respuesta = await utilQuery(query, [req.params.id]);

        res.status(200).send("La categoria se borro correctamente");
    }
    catch (e) {
        console.error(e.message);
        res.status(413).send({ "mensaje": e.message })
    }
});

/* ===== 2) LIBRO ===== */
// GET todos los libros
app.get('/libro', async (req, res) => {
    try {
        const query = 'SELECT * FROM libro';

        let respuesta = await utilQuery(query);

        res.status(200).send({ "respuesta": respuesta });
    }

    catch (e) {
        console.error(e.message);
        res.status(413).send({ "mensaje": e.message })
    }
});
// GET solo un libro
app.get('/libro/:id', async (req, res) => {
    try {
        const query = 'SELECT * FROM libro WHERE id = ?';

        let respuesta = await utilQuery(query, req.params.id);

        // verifica si el libro existe
        if (respuesta.length === 0) {
            throw new Error("No se encuentra ese libro");
        }

        res.status(200).send({ "respuesta": respuesta });
    }
    catch (e) {
        console.error(e.message);
        res.status(413).send({ "mensaje": e.message })
    }
});
// POST libro
app.post('/libro', async (req, res) => {
    try {
        // valida datos obligatorios (nombre_libro, categoria_id)
        if (!req.body.nombre_libro || !req.body.categoria_id) {
            throw new Error("Nombre y categoria son datos obligatorios!");
        }

        // valida que no se ingrese un nombre en blanco
        if (/^\s+$/.test(req.body.nombre_libro)) {
            throw new Error("No es posible ingresar solo espacios en blanco en el nombre del libro");
        }

        // si el campo "descripción" viene vacio se le agrega un array vacio
        if (!req.body.descripcion) {
            req.body.descripcion = "";
        };

        // Valida que exista la categoria
        let query = 'SELECT * FROM categoria WHERE id = ?';

        let respuesta = await utilQuery(query, [req.body.categoria_id]);

        if (respuesta.length == 0) {
            throw new Error("No existe la categoria indicada!");
        }

        // valida si el valor del campo "persona_id" hace referencia a una persona existente
        if (req.body.persona_id > 0) {
            query = 'SELECT id FROM persona WHERE id = ?';

            respuesta = await utilQuery(query, [req.body.persona_id]);

            if (respuesta.length == 0) {
                throw new Error("No existe la persona indicada!");
            }
        };

        // valida si el campo "persona_id" esta vacio. En ese caso le da el valor null
        if (!req.body.persona_id) {
            req.body.persona_id = null;
        };

        // declara variables
        const nombre_libro = req.body.nombre_libro.toUpperCase();
        const descripcion = req.body.descripcion.toUpperCase()
        const categoria_bd = req.body.categoria_id;
        const persona = req.body.persona_id;

        // valida que exista el libro indicado
        query = 'SELECT * FROM libro WHERE nombre_libro = ?';

        respuesta = await utilQuery(query, [nombre_libro]);

        if (respuesta.length > 0) {
            throw new Error("Ese nombre de libro ya existe!");
        }

        // Insertar libro en la BD
        query = 'INSERT INTO libro (nombre_libro, descripcion, categoria_id, persona_id) VALUES (?, ?, ?, ?)';
        respuesta = await utilQuery(query, [nombre_libro, descripcion, categoria_bd, persona]);

        res.status(200).send({ "id": req.params.id, "nombre": nombre_libro, "descripcion": descripcion, "categoria_id": categoria_bd, "persona_id": persona });
    }
    catch (e) {
        console.error(e.message);
        res.status(413).send({ "mensaje": e.message })
    }
});
// PUT libro
app.put('/libro/:id', async (req, res) => {
    try {
        // valida que se ingresen todos los datos
        if (req.body.descripcion == "") {
            throw new Error("El campo 'descripcion' no puede estar vacio");
        }

        // problema: null en "persona_id" es tomado como campo inexistente si se coloca
        if (!req.body.nombre_libro || !req.body.descripcion || !req.body.categoria_id ) {
            throw new Error("Ingresar los datos obligatorios");
        }

        // valida que no se ingrese un nombre en blanco
        if (/^\s+$/.test(req.body.nombre_libro)) {
            throw new Error("No es posible ingresar solo espacios en blanco en el nombre del libro");
        }

        // Valida que exista la categoria 
        let query = 'SELECT * FROM categoria WHERE id = ?';

        let respuesta = await utilQuery(query, [req.body.categoria_id]);

        if (respuesta.length == 0) {
            throw new Error("No existe la categoria indicada!");
        }

        // valida que la categoria_id del libro y la proporcionada coincidan
        query = 'SELECT * FROM libro WHERE id = ?';

        respuesta = await utilQuery(query, [req.params.id]);
        
        if (respuesta[0].categoria_id != req.body.categoria_id) {
            throw new Error("El número de categoria no coincide con la del ID proporcionado. No es posible alterar la categoría a la que pertenece el libro, solo su descripción");
        }

        // valida que la informacion de "persona_id" coincida
        query = 'SELECT * FROM libro WHERE id = ?';

        respuesta = await utilQuery(query, [req.params.id]);
        
        if (respuesta[0].persona_id != req.body.persona_id) {
            throw new Error("El valor de 'persona_id' no coincide con la del ID proporcionado. Para alterar este valor direccione la petición a '/libro/prestar/:id' o '/libro/devolver/:id'.");
        }
        
        // declara variables
        const nombre_libro = req.body.nombre_libro.toUpperCase();
        const descripcion = req.body.descripcion.toUpperCase()
        const categoria_bd = req.body.categoria_id;
        const persona = req.body.persona_id;

        // Valida libro en BD y si coincide con id proporcionado
        query = 'SELECT * FROM libro WHERE nombre_libro = ? AND id = ?';

        respuesta = await utilQuery(query, [req.body.nombre_libro, req.params.id]);

        if (respuesta.length == 0) {
            throw new Error("El nombre de libro no coincide con el del ID proporcionado. No es posible alterar el nombre del libro, solo su descripción");
        }

        // update de la BD
        query = 'UPDATE libro SET descripcion = ? WHERE id = ?';

        respuesta = await utilQuery(query, [descripcion, req.params.id]);

        res.status(200).send({ "id": req.params.id, "nombre": nombre_libro, "descripcion": descripcion, "categoria_id": categoria_bd, "persona_id": persona });
    }
    catch (e) {
        console.error(e.message);
        res.status(413).send({ "mensaje": e.message })
    }
});
// PUT libro prestar
app.put('/libro/prestar/:id', async (req, res) => {
    try {
        // Verificación de datos ingresados: ID libro y Id persona a prestar
        if (!req.body.persona_id || !req.params.id) {
            throw new Error("Es necesario que se ingresen correctamente el ID de la persona a prestar y el ID del libro");
        }

        // Verifica que el libro exista
        let query = 'SELECT * FROM libro WHERE id = ?';

        let respuesta = await utilQuery(query, [req.params.id]);

        if (respuesta.length == 0) {
            throw new Error("No se encontro el libro");
        }

        // Verifica que el USUARIO exista
        query = 'SELECT * FROM persona WHERE id = ?';

        respuesta = await utilQuery(query, [req.body.persona_id]);

        if (respuesta.length == 0) {
            throw new Error("No se encontro la persona a la que se quiere prestar el libro");
        }

        // Verificación que el libro NO este prestado
        query = 'SELECT persona_id FROM libro WHERE id = ?';

        respuesta = await utilQuery(query, [req.params.id]);
        
        if (respuesta[0].persona_id != null) {
            throw new Error("El libro ya ha sido prestado");
        }

        // Se realiza la actualización de la base de datos
        query = 'UPDATE libro SET persona_id = ? WHERE id = ?';

        respuesta = await utilQuery(query, [req.body.persona_id, req.params.id]);

        res.status(200).send("El libro se prestó correctamente");
    }
    catch (e) {
        console.error(e.message);
        res.status(413).send({ "mensaje": e.message })
    }
});
// PUT libro devolver
app.put('/libro/devolver/:id', async (req, res) => {
    try {
        // Verificación de datos ingresados: ID libro y Id persona a prestar
        if (!req.params.id) {
            throw new Error("Es necesario que ingrese correctamente el ID del libro a devolver");
        }

        // valida que el libro exista
        let query = 'SELECT * FROM libro WHERE id = ?';

        let respuesta = await utilQuery(query, [req.params.id]);

        if (respuesta.length == 0) {
            throw new Error("No se encontro el libro");
        }

        // valida que el libro ESTE prestado
        query = 'SELECT persona_id FROM libro WHERE id = ?';

        respuesta = await utilQuery(query, [req.params.id]);
        
        if (respuesta[0].persona_id == null) {
            throw new Error("El libro no ha sido prestado aún");
        }

        // update de la base de datos
        query = 'UPDATE libro SET persona_id = null WHERE id = ?';

        respuesta = await utilQuery(query, [req.params.id]);

        res.status(200).send("El libro se devolvió correctamente");
    }
    catch (e) {
        console.error(e.message);
        res.status(413).send({ "mensaje": e.message })
    }
});
// DELETE libro
app.delete('/libro/:id', async (req, res) => {
    try {
        //Valida de que los datos del libro sean correctos
        let query = 'SELECT * FROM libro WHERE id = ?';

        let respuesta = await utilQuery(query, [req.params.id]);

        if (respuesta.length == 0) {
            throw new Error("Ese libro no existe");
        }

        // Verifica que el libro NO ESTE PRESTADO;
        query = 'SELECT persona_id FROM libro WHERE id = ?';

        respuesta = await utilQuery(query, [req.params.id]);
        
        if (respuesta[0].persona_id != null) {
            throw new Error("El libro ha sido prestado, no se puede borrar");
        }

        // delete del libro de la BD
        query = 'DELETE FROM libro WHERE id = ?';

        respuesta = await utilQuery(query, [req.params.id]);

        res.status(200).send("El libro se borró correctamente");
    }
    catch (e) {
        console.error(e.message);
        res.status(413).send({ "mensaje": e.message })
    }
});

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