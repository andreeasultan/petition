var canvas = $("#canvas");
var signature = $("#signature");
var offsetX;
var offsetY;
var canvasPositionMobile = canvas.offset(); //tells me where the canvas is on the phone

var cxt = document.getElementById("canvas").getContext("2d");
canvas.on("mousedown", function(e) {
    console.log("mouseup has happened");
    cxt.strokeStyle = "black";
    cxt.beginPath();
    offsetX = e.offsetX;
    offsetY = e.offsetY;

    canvas.on("mousemove", function(e) {
        console.log("mouseup has happened");
        offsetX = e.offsetX;
        offsetY = e.offsetY;
        cxt.lineTo(offsetX, offsetY);
        cxt.stroke();
    });
});

canvas.on("mouseup", function() {
    console.log("mouseup has happened");
    signature.val(document.getElementById("canvas").toDataURL());
    canvas.unbind("mousemove");
});

canvas.on("touchstart", function(e) {
    offsetX = e.touches[0].pageX - canvasPositionMobile.left;
    offsetY = e.touches[0].pageY - canvasPositionMobile.top;
    cxt.strokeStyle = "black";
    cxt.beginPath();
    e.preventDefault();
});

canvas.on("touchmove", function(e) {
    offsetX = e.touches[0].pageX - canvasPositionMobile.left;
    offsetY = e.touches[0].pageY - canvasPositionMobile.top;
    cxt.lineTo(offsetX, offsetY);
    cxt.stroke();
    e.preventDefault();

    $('input[name="signature"]').val(canvas[0].toDataURL());
});
