const pool = require("../../db.js");
const { logEvent } = require("../../middleware/bitacora.middleware.js");

// Helper: convierte un entero (minutos) o string numérico a TIME 'HH:MM:SS'
// Asumimos que el valor recibido representa minutos. Si prefieres segundos, se puede ajustar.
const toSqlTimeFromMinutes = (value) => {
  if (value === null || value === undefined || value === "") return null;

  // Aceptar números o strings numéricos
  const n = Number(value);
  if (Number.isNaN(n) || n < 0) return null;

  const totalSeconds = Math.floor(n * 60); // minutos -> segundos
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  // Formatear con ceros a la izquierda
  const hh = String(hours).padStart(2, "0");
  const mm = String(minutes).padStart(2, "0");
  const ss = String(seconds).padStart(2, "0");

  return `${hh}:${mm}:${ss}`;
};

// ----------------------------
// Crear una nueva receta
// ----------------------------
const createReceta = async (req, res) => {
  const { unidades, tiempo, id_producto } = req.body;

  try {
    const producto = await pool.query("SELECT * FROM producto WHERE id = $1", [id_producto]);
    if (producto.rows.length === 0) {
      return res.status(400).json({ message: "El producto asociado no existe." });
    }

    // Convertir 'tiempo' (minutos) a formato TIME para Postgres
    const tiempoSql = toSqlTimeFromMinutes(tiempo);
    if (tiempoSql === null) {
      return res.status(400).json({ message: "Tiempo inválido. Proporcione un número de minutos >= 0." });
    }

    await pool.query(
      `INSERT INTO receta (unidades, tiempo, id_producto)
       VALUES ($1, $2, $3)`,
      [unidades, tiempoSql, id_producto]
    );

    await logEvent(
      req.user.bitacoraId,
      "POST",
      "api/receta/create",
      `Receta creada para producto ID ${id_producto}`
    );

    res.json({ message: "Receta creada exitosamente" });
  } catch (error) {
    console.error("Error al crear receta:", error);
    res.status(500).json({ message: "Error al crear la receta" });
  }
};

// ----------------------------
// Obtener todas las recetas
// ----------------------------
const readReceta = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT r.id, r.unidades, r.tiempo, r.id_producto, p.nombre AS producto
      FROM receta r
      JOIN producto p ON r.id_producto = p.id
      ORDER BY r.id ASC
    `);

    await logEvent(req.user.bitacoraId, "GET", "api/receta/read", "Consulta de recetas");

    res.json(result.rows);
  } catch (error) {
    console.error("Error al obtener recetas:", error);
    res.status(500).json({ message: "Error al obtener recetas" });
  }
};

// ----------------------------
// Obtener receta por ID
// ----------------------------
const readRecetaById = async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      `SELECT r.id, r.unidades, r.tiempo, r.id_producto, p.nombre AS producto
       FROM receta r
       JOIN producto p ON r.id_producto = p.id
       WHERE r.id = $1`,
      [id]
    );

    if (result.rows.length === 0)
      return res.status(404).json({ message: "Receta no encontrada" });

    await logEvent(
      req.user.bitacoraId,
      "GET",
      `api/receta/read/:${id}`,
      `Consulta de receta ${id}`
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error al obtener receta:", error);
    res.status(500).json({ message: "Error al obtener receta" });
  }
};

// ----------------------------
// Actualizar una receta
// ----------------------------
const updateReceta = async (req, res) => {
  const { id } = req.params;
  const { unidades, tiempo, id_producto } = req.body;

  try {
    const producto = await pool.query("SELECT * FROM producto WHERE id = $1", [id_producto]);
    if (producto.rows.length === 0) {
      return res.status(400).json({ message: "El producto asociado no existe." });
    }

    const existing = await pool.query("SELECT * FROM receta WHERE id_producto = $1 AND id <> $2", [id_producto, id]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ message: "El producto ya esta asociado a una receta." });
    }

    // Convertir 'tiempo' a formato TIME antes de actualizar
    const tiempoSql = toSqlTimeFromMinutes(tiempo);
    if (tiempoSql === null) {
      return res.status(400).json({ message: "Tiempo inválido. Proporcione un número de minutos >= 0." });
    }

    await pool.query(
      `UPDATE receta
       SET unidades = $1, tiempo = $2, id_producto = $3
       WHERE id = $4`,
      [unidades, tiempoSql, id_producto, id]
    );

    await logEvent(
      req.user.bitacoraId,
      "PUT",
      `api/receta/update/:${id}`,
      `Receta ${id} actualizada`
    );

    res.json({ message: "Receta actualizada exitosamente" });
  } catch (error) {
    console.error("Error al actualizar receta:", error);
    res.status(500).json({ message: "Error al actualizar receta" });
  }
};

// ----------------------------
// Eliminar una receta
// ----------------------------
const deleteReceta = async (req, res) => {
  const { id } = req.params;

  try {
    await pool.query("DELETE FROM receta WHERE id = $1", [id]);

    await logEvent(
      req.user.bitacoraId,
      "DELETE",
      `api/receta/delete/:${id}`,
      `Receta ${id} eliminada`
    );

    res.json({ message: "Receta eliminada exitosamente" });
  } catch (error) {
    console.error("Error al eliminar receta:", error);
    res.status(500).json({ message: "Error al eliminar receta" });
  }
};

module.exports = {
  createReceta,
  readReceta,
  readRecetaById,
  updateReceta,
  deleteReceta,
};
