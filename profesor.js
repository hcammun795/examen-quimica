const supabaseUrl = 'https://uiletyxxsmsxwjvnfziu.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVpbGV0eXh4c21zeHdqdm5meml1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgzMTM1NzUsImV4cCI6MjA5Mzg4OTU3NX0.d-QGKtt6IQxwfKRw7rEhFF3VGF_x9xIgf_2k4jkSIAk';
const _supabase = supabase.createClient(supabaseUrl, supabaseKey);

async function cargarEstadisticas() {
    // Pedimos las estadísticas y los nombres de los alumnos de la tabla perfiles
    const { data, error } = await _supabase
        .from('estadisticas')
        .select(`
            intentos,
            aciertos,
            email_alumno,
            tipos_compuestos(nombre),
            perfiles:email_alumno(nombre_alumno)
        `);

    if (data) {
        let html = `<table><tr><th>Alumno</th><th>Tema</th><th>Nota</th></tr>`;
        data.forEach(reg => {
            const nombre = reg.perfiles ? reg.perfiles.nombre_alumno : reg.email_alumno;
            const nota = Math.round((reg.aciertos / reg.intentos) * 100);
            html += `<tr><td>${nombre}</td><td>${reg.tipos_compuestos.nombre}</td><td>${nota}%</td></tr>`;
        });
        document.getElementById('stats-container').innerHTML = html + `</table>`;
    }
}

window.onload = cargarEstadisticas;
