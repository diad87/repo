export const KEYBOARD_LAYOUTS = {
    "iso_es": {
      name: "ISO - Español",
      layout: [
          [{key:"º",group:6,finger:"pinky-left"}, {key:"1",group:6,finger:"pinky-left"}, {key:"2",group:4,finger:"ring-left"}, {key:"3",group:3,finger:"middle-left"}, {key:"4",group:1,finger:"index-left"}, {key:"5",group:1,finger:"index-left"}, {key:"6",group:2,finger:"index-right"}, {key:"7",group:2,finger:"index-right"}, {key:"8",group:3,finger:"middle-right"}, {key:"9",group:4,finger:"ring-right"}, {key:"0",group:6,finger:"pinky-right"}, {key:"'",group:6,finger:"pinky-right"}, {key:"¡",group:6,finger:"pinky-right"}, {key:"Backspace",label:"←",size:2,group:6,finger:"pinky-right"}],
          [{key:"Tab",size:1.5,group:6,finger:"pinky-left"}, {key:"Q",group:6,finger:"pinky-left"}, {key:"W",group:4,finger:"ring-left"}, {key:"E",group:3,finger:"middle-left"}, {key:"R",group:1,finger:"index-left"}, {key:"T",group:1,finger:"index-left"}, {key:"Y",group:2,finger:"index-right"}, {key:"U",group:2,finger:"index-right"}, {key:"I",group:3,finger:"middle-right"}, {key:"O",group:4,finger:"ring-right"}, {key:"P",group:6,finger:"pinky-right"}, {key:"`",group:6,finger:"pinky-right"}, {key:"+",group:6,finger:"pinky-right"}, {key:"\\",size:1.5,group:6,finger:"pinky-right"}],
          [{key:"CapsLock",label:"Bloq Mayús",size:1.75,group:6,finger:"pinky-left"}, {key:"A",group:6,finger:"pinky-left"}, {key:"S",group:4,finger:"ring-left"}, {key:"D",group:3,finger:"middle-left"}, {key:"F",group:1,finger:"index-left"}, {key:"G",group:1,finger:"index-left"}, {key:"H",group:2,finger:"index-right"}, {key:"J",group:2,finger:"index-right"}, {key:"K",group:3,finger:"middle-right"}, {key:"L",group:4,finger:"ring-right"}, {key:"Ñ",group:6,finger:"pinky-right"}, {key:"´",group:6,finger:"pinky-right"}, {key:"Ç",group:6,finger:"pinky-right"}, {key:"Enter",size:2.25,group:6,finger:"pinky-right"}],
          [{key:"ShiftLeft",label:"Shift",size:1.25,group:6,finger:"pinky-left"}, {key:"<",group:6,finger:"pinky-left"}, {key:"Z",group:6,finger:"ring-left"}, {key:"X",group:4,finger:"middle-left"}, {key:"C",group:3,finger:"index-left"}, {key:"V",group:1,finger:"index-left"}, {key:"B",group:1,finger:"index-right"}, {key:"N",group:2,finger:"index-right"}, {key:"M",group:2,finger:"middle-right"}, {key:",",group:3,finger:"ring-right"}, {key:".",group:4,finger:"pinky-right"}, {key:"-",group:6,finger:"pinky-right"}, {key:"ShiftRight",label:"Shift",size:3.75,group:6,finger:"pinky-right"}],
          [{key:"CtrlLeft",label:"Ctrl",size:1.25,group:6,finger:"pinky-left"}, {key:"Win",size:1.25,group:6}, {key:"AltLeft",label:"Alt",size:1.25,group:5,finger:"thumb-left"}, {key:"Space",label:"",size:6.25,group:5,finger:"thumb"}, {key:"AltRight",label:"AltGr",size:1.25,group:5,finger:"thumb-right"}, {key:"Menu",size:1.25,group:6}, {key:"CtrlRight",label:"Ctrl",size:1.25,group:6,finger:"pinky-right"}]
      ]
    },
    "ansi_en": {
      name: "ANSI - Inglés",
      layout: [
          [{key:"`", size:1}, {key:"1",size:1}, {key:"2",size:1}, {key:"3",size:1}, {key:"4",size:1}, {key:"5",size:1}, {key:"6",size:1}, {key:"7",size:1}, {key:"8",size:1}, {key:"9",size:1}, {key:"0",size:1}, {key:"-",size:1}, {key:"=",size:1}, {key:"Backspace",label:"←",size:2}],
          [{key:"Tab",size:1.5}, "Q","W","E","R","T","Y","U","I","O","P", {key:"[",size:1}, {key:"]",size:1}, {key:"\\",size:1.5}],
          [{key:"CapsLock",label:"Bloq Mayús",size:1.75}, "A","S","D","F","G","H","J","K","L", {key:";",size:1}, {key:"'",size:1}, {key:"Enter",size:2.25}],
          [{key:"ShiftLeft",label:"Shift",size:2.25}, "Z","X","C","V","B","N","M", {key:",",size:1}, {key:".",size:1}, {key:"/",size:1}, {key:"ShiftRight",label:"Shift",size:2.75}],
          [{key:"CtrlLeft",label:"Ctrl",size:1.25}, {key:"Win",size:1.25}, {key:"AltLeft",label:"Alt",size:1.25}, {key:"Space",label:"",size:6.25}, {key:"AltRight",label:"Alt",size:1.25}, {key:"Menu",size:1.25}, {key:"CtrlRight",label:"Ctrl",size:1.25}]
      ]
    }
  };
  