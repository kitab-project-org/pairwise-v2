import os, sys, re

def deNormalize(text):
    alifs           = '[إأٱآا]'
    alifReg         = '[إأٱآا]'
    # -------------------------------------
    alifMaqsura     = '[يى]'
    alifMaqsuraReg  = '[يى]'
    # -------------------------------------
    taMarbutas      = 'ة'
    taMarbutasReg   = '[هة]'
    # -------------------------------------
    hamzas          = '[ؤئء]'
    hamzasReg       = '[ؤئءوي]'
    # Applying deNormalization
    text = re.sub(alifs, alifReg, text)
    text = re.sub(alifMaqsura, alifMaqsuraReg, text)
    text = re.sub(taMarbutas, taMarbutasReg, text)
    text = re.sub(hamzas, hamzasReg, text)
    return(text)


textVar = "12	0.12	0.12	64	0	128.0	19630441	40283479	JK007088_001869_PageV02P675	Shamela0013115_003834_PageV05P309	88	100	0	12	ان جعلنا ملوكا واصطفي من خير خلقه رسولا اكرمه نسبا واصدقه حديثا	ان جعلنا ملوكا واصطفي من خير خلقه رسولا اكرمه نسبا واصدقه حديثا"
textVar = textVar.split("\t")

jk = textVar[-2]
sh = textVar[-1]

#print(jk)

def reGen(text):
    text = text.replace("-", "") # removes dashes
    length = len(text.split(" ")) # counts length in words (not sure is necessary)
    text = deNormalize(text) # orthographic possibilities RE
    #input(text)
    #print()
    text = re.sub(" +", " ", text) # remove possible double spaces
    
    possibilities = "(\W+(\d+)?)?(Page\w+)?" # possibilities of what can be between the words
    text = text.replace(" ", possibilities)

    with open("text_reGen.txt", "w", encoding="utf8") as f9:
        f9.write(text)

    return(text)


print(reGen(jk))
    
