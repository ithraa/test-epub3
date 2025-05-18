window.onload = function () {
    var footnoteLinks = document.getElementsByClassName("_idFootnoteLink");
    var footnoteAnchors = document.getElementsByClassName("_idFootnoteAnchor");
    
    var hindiNumbers = ["\u0661", "\u0662", "\u0663", "\u0664", "\u0665", "\u0666", "\u0667", "\u0668", "\u0669"];

    for (var a = 0; a < footnoteLinks.length; a++) {

        var numText = " (" + hindiNumbers[a] + ") ";
        footnoteLinks[a].innerHTML = numText;
        footnoteAnchors[a].innerHTML = numText;
    }
    
    }